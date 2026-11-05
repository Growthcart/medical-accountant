import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/requireAdmin';
import { BUCKETS } from '@/lib/storage/r2';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024;

function bucketOf(value: unknown): string | null {
  return typeof value === 'string' && (BUCKETS as readonly string[]).includes(value) ? value : null;
}

// Object keys are "<bucket>/<path>"; keep paths flat so nothing escapes the bucket.
function safePath(path: unknown): string | null {
  return typeof path === 'string' && /^[A-Za-z0-9][A-Za-z0-9._ -]{0,200}$/.test(path) ? path : null;
}

// Admin-only storage API used by lib/db/client.ts (upload, list, delete).
export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;

  const form = await request.formData();
  const bucket = bucketOf(form.get('bucket'));
  const path = safePath(form.get('path'));
  const file = form.get('file');
  if (!bucket || !path || !(file instanceof Blob)) return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File is larger than 10 MB' }, { status: 413 });

  const { error } = await gate.db.storage
    .from(bucket)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: form.get('upsert') === '1' });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;

  const q = request.nextUrl.searchParams;
  const bucket = bucketOf(q.get('bucket'));
  if (!bucket) return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
  const { data, error } = await gate.db.storage
    .from(bucket)
    .list(q.get('prefix') || '', { limit: Number(q.get('limit')) || 100, offset: Number(q.get('offset')) || 0 });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate instanceof NextResponse) return gate;

  const body = await request.json().catch(() => null);
  const bucket = bucketOf(body?.bucket);
  const paths = Array.isArray(body?.paths) ? body.paths.map(safePath) : [];
  if (!bucket || paths.length === 0 || paths.includes(null)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { error } = await gate.db.storage.from(bucket).remove(paths as string[]);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
