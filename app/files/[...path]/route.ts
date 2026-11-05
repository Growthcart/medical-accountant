import { NextRequest } from 'next/server';
import { dbEnv } from '@/lib/db/env';
import { BUCKETS } from '@/lib/storage/r2';

export const dynamic = 'force-dynamic';

// Public file server for Supabase Storage objects: /files/<bucket>/<path>. Not needed if
// the bucket is served from a custom domain (NEXT_PUBLIC_R2_PUBLIC_URL).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const [bucket, ...rest] = (await params).path;
  if (!(BUCKETS as readonly string[]).includes(bucket) || rest.length === 0) return new Response('Not found', { status: 404 });

  const object = await dbEnv().BUCKET.get(`${bucket}/${rest.join('/')}`);
  if (!object) return new Response('Not found', { status: 404 });

  const type = object.httpMetadata?.contentType || 'application/octet-stream';
  const headers: Record<string, string> = {
    'Content-Type': type,
    'Content-Length': String(object.size),
    ETag: object.httpEtag,
    // File names carry a timestamp or random suffix, so a name never changes content.
    'Cache-Control': 'public, max-age=31536000, immutable',
  };
  // Visitor uploads (PDFs, documents) download instead of rendering on this origin.
  if (!type.startsWith('image/')) headers['Content-Disposition'] = 'attachment';
  return new Response(object.body, { headers });
}
