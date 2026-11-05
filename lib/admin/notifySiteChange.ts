import { createClient } from '@/lib/db/client';

export type SiteChange =
  | { postId: string; previous?: { slug: string | null; categorySlug: string | null; status: string | null } }
  | { previous: { slug: string; categorySlug: string | null; status?: string | null } }
  | { category: { id: string; oldSlug: string; newSlug: string } }
  // Site-wide settings (banners, tracking, verification) changed.
  | { site: true };

// Tell the server that blog content changed so it refreshes cached pages and
// adds 301s for moved URLs (app/api/revalidate). Best effort: a failure only
// delays the update until the hourly revalidation.
export async function notifySiteChange(change: SiteChange): Promise<void> {
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(change),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.warn('[admin] revalidate failed:', res.status);
  } catch (err) {
    console.warn('[admin] revalidate failed:', err);
  }
}
