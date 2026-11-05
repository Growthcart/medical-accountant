import { NextRequest, NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/api-auth';
import { createServiceClient } from '@/lib/db/server';
import { createPost, getPostRow, PostApiError, slugify, updatePost, type PostWriteInput } from '@/lib/posts-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Programmatic publishing endpoint (Claude Code MCP server, integrations).
//
//   POST /api/posts/create  { title, content, category_slug, author_username, ... }
//     -> creates the post; with `update_existing: true` the post found by `id`
//        (or by `slug`) is updated in place instead. `new_slug` renames it.
//   GET  /api/posts/create  -> categories and authors you can publish as.
//
// Auth: POSTS_API_KEY (x-api-key or Bearer) or a signed-in admin.
export async function POST(request: NextRequest) {
  const auth = await authorizeApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { update_existing, id, new_slug, ...body } = (await request.json()) as PostWriteInput & {
      update_existing?: boolean;
      id?: string;
      new_slug?: string;
    };

    if (update_existing) {
      const existing = await getPostRow(id ? { id } : { slug: slugify(body.slug || body.title || '') });
      if (!existing) return NextResponse.json({ error: 'Post to update was not found' }, { status: 404 });
      // `slug` addressed the post; only `new_slug` renames it.
      const changes: Partial<PostWriteInput> = { ...body, slug: new_slug ?? undefined };
      const result = await updatePost({ id: existing.id }, changes);
      return NextResponse.json({ success: true, created: false, updated: true, revalidated: result.revalidated, post: result.post });
    }

    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 });
    }
    // Admin sessions publish as themselves unless they name another author.
    if (auth.via === 'session' && !body.author_id && !body.author_username) body.author_id = auth.userId;

    const result = await createPost(body);
    return NextResponse.json({ success: true, created: true, updated: false, revalidated: result.revalidated, post: result.post });
  } catch (error) {
    if (error instanceof PostApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[posts/create] error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await authorizeApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const db = createServiceClient();
  const [{ data: categories }, { data: authors }] = await Promise.all([
    db.from('categories').select('id, name, slug, description').order('name'),
    db.from('profiles').select('id, username, full_name, role').eq('role', 'admin').order('full_name'),
  ]);

  return NextResponse.json({ categories: categories || [], authors: authors || [] });
}
