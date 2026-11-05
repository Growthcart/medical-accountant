import { createServiceClient } from '@/lib/db/server';

// Server-side image import for the publishing API and the MCP connector:
// download (or receive) an image, check it really is one, store it in the
// post-images bucket and report whether it is big enough for Google Discover.
//
// shortcut: images are stored as received. Workers cannot run sharp, so there
// is no server-side WebP conversion or resize (the admin editor still
// converts to WebP in the browser); add Cloudflare Images if that matters.

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
// Google Discover only surfaces articles whose main image is >= 1200px wide.
export const DISCOVER_MIN_WIDTH = 1200;
const BUCKET = 'post-images';

export interface StoredImage {
  url: string;
  path: string;
  width: number;
  height: number;
  bytes: number;
  content_type: string;
  discover_ready: boolean;
  warnings: string[];
}

export class ImageError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// Refuse hosts that are obviously internal. Fetch on Workers cannot reach
// private networks anyway, so this only rejects literal IPs and local names
// early with a clear message; there is no DNS lookup on Workers.
export async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new ImageError('Image URL must be http(s)');
  }
  const host = url.hostname.toLowerCase();
  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  const [a, b] = v4 ? [Number(v4[1]), Number(v4[2])] : [0, 0];
  const privateV4 =
    v4 &&
    (a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168));
  if (
    privateV4 ||
    host.startsWith('[') ||
    host === 'localhost' ||
    !host.includes('.') ||
    /\.(local|localhost|internal|lan|home|corp)$/.test(host)
  ) {
    throw new ImageError('Image URL must point to a public host');
  }
}

// Download an image from a public URL into a size-capped buffer. Redirects
// are followed by hand (at most 3) so every hop is checked.
export async function fetchImageBuffer(url: string): Promise<Uint8Array> {
  let current: URL;
  try {
    current = new URL(url);
  } catch {
    throw new ImageError(`Not a valid URL: ${url}`);
  }

  const signal = AbortSignal.timeout(15_000);
  let res: Response | null = null;
  for (let hop = 0; hop <= 3; hop++) {
    await assertPublicHost(current);
    res = await fetch(current, {
      redirect: 'manual',
      signal,
      headers: { 'User-Agent': 'CmsBot/1.0 (+https://medicalaccountant.ie)', Accept: 'image/*' },
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current);
      continue;
    }
    break;
  }
  if (!res || (res.status >= 300 && res.status < 400)) throw new ImageError('Too many redirects');
  if (!res.ok) throw new ImageError(`Could not download the image (${res.status})`);

  const declared = Number(res.headers.get('content-length') || '0');
  if (declared && declared > IMAGE_MAX_BYTES) throw new ImageError('The image is larger than 10 MB', 413);

  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > IMAGE_MAX_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new ImageError('The image is larger than 10 MB', 413);
      }
      chunks.push(value);
    }
  }
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  if (buffer.length === 0) throw new ImageError('Downloaded image is empty');
  return buffer;
}

function safeBaseName(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  const base = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  return (
    base
      .replace(/[^a-zA-Z0-9_\- ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .slice(0, 80) || 'image'
  );
}

export interface ImageInfo {
  type: 'png' | 'jpeg' | 'webp' | 'gif';
  width: number;
  height: number;
}

// Format, width and height read from the first bytes of an image file, or
// null when it is not a PNG, JPEG, WebP or GIF.
export function readImageInfo(buf: Uint8Array): ImageInfo | null {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const ascii = (from: number, to: number) => String.fromCharCode(...buf.subarray(from, to));
  if (buf.length > 24 && ascii(1, 4) === 'PNG') {
    return { type: 'png', width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (buf.length > 10 && ascii(0, 3) === 'GIF') {
    return { type: 'gif', width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) { o++; continue; }
      const marker = buf[o + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { type: 'jpeg', width: view.getUint16(o + 7), height: view.getUint16(o + 5) };
      }
      o += 2 + view.getUint16(o + 2);
    }
    return null;
  }
  if (buf.length > 30 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    const fmt = ascii(12, 16);
    if (fmt === 'VP8X') {
      return {
        type: 'webp',
        width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
        height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
      };
    }
    if (fmt === 'VP8 ') {
      return { type: 'webp', width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
    if (fmt === 'VP8L') {
      const bits = view.getUint32(21, true);
      return { type: 'webp', width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
    }
  }
  return null;
}

// Validate and store an article image, keeping the file name (same naming
// as admin uploads: name-timestamp.ext).
export async function processAndStorePostImage(input: {
  buffer: Uint8Array;
  filename: string;
}): Promise<StoredImage> {
  if (input.buffer.length > IMAGE_MAX_BYTES) throw new ImageError('The image is larger than 10 MB', 413);

  const info = readImageInfo(input.buffer);
  if (!info) throw new ImageError('The file is not a supported image (PNG, JPEG, WebP or GIF; SVG is not accepted)');

  const ext = info.type === 'jpeg' ? 'jpg' : info.type;
  const contentType = `image/${info.type}`;
  const path = `${safeBaseName(input.filename)}-${Date.now()}.${ext}`;

  const db = createServiceClient();
  const { error } = await db.storage.from(BUCKET).upload(path, input.buffer, { contentType, upsert: false });
  if (error) throw new ImageError(`Upload failed: ${error.message}`, 500);
  const { data: publicUrl } = db.storage.from(BUCKET).getPublicUrl(path);

  const warnings: string[] = [];
  if (info.width < DISCOVER_MIN_WIDTH) {
    warnings.push(`Image is ${info.width}px wide; Google Discover needs at least ${DISCOVER_MIN_WIDTH}px.`);
  }
  return {
    url: publicUrl.publicUrl,
    path,
    width: info.width,
    height: info.height,
    bytes: input.buffer.length,
    content_type: contentType,
    discover_ready: info.width >= DISCOVER_MIN_WIDTH,
    warnings,
  };
}
