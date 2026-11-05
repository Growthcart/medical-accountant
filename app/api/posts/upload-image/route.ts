import { NextRequest, NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/api-auth';
import { fetchImageBuffer, ImageError, IMAGE_MAX_BYTES, processAndStorePostImage } from '@/lib/images';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Upload a featured or inline image for a post.
//
//   POST /api/posts/upload-image
//     JSON: { source_url | content_base64, filename? }
//     or multipart/form-data with a `file` field.
//   -> { url, path, width, height, bytes, content_type, discover_ready, warnings[] }
export async function POST(request: NextRequest) {
  const auth = await authorizeApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    let buffer: Uint8Array;
    let filename: string;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
      if (file.size > IMAGE_MAX_BYTES) return NextResponse.json({ error: 'The image is larger than 10 MB' }, { status: 413 });
      buffer = new Uint8Array(await file.arrayBuffer());
      filename = file.name || 'image';
    } else {
      const body = await request.json();
      if (body.source_url) {
        buffer = await fetchImageBuffer(String(body.source_url));
        filename = body.filename || new URL(String(body.source_url)).pathname.split('/').pop() || 'image';
      } else if (body.content_base64) {
        buffer = Uint8Array.from(atob(String(body.content_base64).replace(/^data:[^;]+;base64,/, '')), (c) => c.charCodeAt(0));
        filename = body.filename || 'image';
      } else {
        return NextResponse.json({ error: 'Provide source_url or content_base64' }, { status: 400 });
      }
    }

    const stored = await processAndStorePostImage({ buffer, filename });
    return NextResponse.json(stored);
  } catch (error) {
    if (error instanceof ImageError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[upload-image] error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
