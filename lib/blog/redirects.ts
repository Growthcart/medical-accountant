import type { DbClient } from '@/lib/db/server';
import { createServiceClient } from '@/lib/db/server';

// 301s for blog URLs that move (post slug or category change, category
// rename). Rows live in url_redirects and are applied by middleware.ts,
// which caches them for up to a minute per server instance.

function variants(path: string): string[] {
  const bare = path.replace(/\/+$/, '') || '/';
  return bare === '/' ? ['/'] : [bare, `${bare}/`];
}

// A page is now live at `path`, so no redirect may send visitors away from it
// (middleware checks redirects before rendering).
export async function clearRedirectsFrom(path: string): Promise<void> {
  const { error } = await createServiceClient().from('url_redirects').delete().in('from_path', variants(path));
  if (error) console.error('[redirects] clear failed:', error.message);
}

// Record that a public page moved from `from` to `to`: points older
// redirects that ended at `from` straight at `to` (no chains), removes any
// redirect away from `to`, and adds `from` -> `to`.
export async function recordMove(input: { from: string; to: string; note: string; createdBy?: string | null }): Promise<void> {
  const from = input.from.replace(/\/+$/, '');
  const to = input.to.replace(/\/+$/, '');
  if (!from || !to || from === to) return;
  const db = createServiceClient();

  await clearRedirectsFrom(to);
  const { error: chainError } = await db
    .from('url_redirects')
    .update({ to_path: to, updated_at: new Date().toISOString() })
    .in('to_path', variants(from));
  if (chainError) console.error('[redirects] collapse failed:', chainError.message);

  const { data: existing } = await db.from('url_redirects').select('id').in('from_path', variants(from)).limit(1);
  if (existing && existing.length > 0) {
    await db
      .from('url_redirects')
      .update({ to_path: to, status_code: 301, updated_at: new Date().toISOString() })
      .eq('id', existing[0].id);
    return;
  }
  const { error } = await db.from('url_redirects').insert({
    from_path: from,
    to_path: to,
    status_code: 301,
    is_automatic: true,
    redirect_type: 'slug-change',
    notes: input.note,
    created_by: input.createdBy ?? null,
  });
  if (error) console.error('[redirects] insert failed:', error.message);
}
