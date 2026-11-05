import { NextRequest, NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/api-auth';
import { getPostRow, listPostRows, PostApiError, toPostSummary } from '@/lib/posts-admin';
import { getPostUrlStructure } from '@/lib/blog/postUrlStructure';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Read side of the publishing API.
//
//   GET /api/posts/lookup?slug=... | ?id=...      -> one post, with content
//   GET /api/posts/lookup?q=&status=&category_slug=&author_username=&limit=&offset=
//                                                  -> paginated list
export async function GET(request: NextRequest) {
  const auth = await authorizeApiRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const params = request.nextUrl.searchParams;
  try {
    const structure = await getPostUrlStructure();
    const id = params.get('id');
    const slug = params.get('slug');
    if (id || slug) {
      const row = await getPostRow({ id: id || undefined, slug: slug || undefined });
      if (!row) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      return NextResponse.json({ post: toPostSummary(row, structure, true) });
    }

    const { rows, total } = await listPostRows({
      q: params.get('q'),
      status: params.get('status'),
      category_slug: params.get('category_slug'),
      author_username: params.get('author_username'),
      limit: params.get('limit') ? Number(params.get('limit')) : undefined,
      offset: params.get('offset') ? Number(params.get('offset')) : undefined,
    });
    return NextResponse.json({ total, posts: rows.map((row) => toPostSummary(row, structure)) });
  } catch (error) {
    if (error instanceof PostApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[posts/lookup] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
