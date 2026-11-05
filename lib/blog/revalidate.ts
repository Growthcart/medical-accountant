import { revalidatePath } from 'next/cache';
import { notifyIndexNow } from '@/lib/indexnow';
import { postPath, type PostUrlStructure } from './postUrl';

export interface RevalidatePostInput {
  slug?: string | null;
  oldSlug?: string | null;
  categorySlug?: string | null;
  oldCategorySlug?: string | null;
  /** URL layout in force; defaults to category. */
  structure?: PostUrlStructure;
}

// Generated files whose content lists posts.
const FEEDS = ['/sitemap.xml', '/image-sitemap.xml', '/feed.xml', '/llms.txt', '/llms-full.txt'];
// Marketing pages that show the latest posts (components/blog/RecentPosts).
// Pages that list recent posts: add your own (home, landing pages).
const PAGES_WITH_RECENT_POSTS = ['/'];

// Invalidate one concrete URL, or a generated file. Route handlers are
// tagged by route segment rather than URL, so files also get the 'layout'
// form, which matches their segment tag.
function revalidateUrl(path: string): void {
  revalidatePath(path);
  if (/\.[a-z0-9]+$/i.test(path)) revalidatePath(path, 'layout');
}

// Invalidate every cached page that shows a post, so a publish or edit is
// visible within seconds instead of after the hourly revalidate window.
// Pages under the (site) route group are tagged with the group in their
// path, so '/(site)/news' + 'layout' refreshes the blog index, every
// category, tag and author archive and all their /page/N pages at once.
export function revalidatePostPaths(input: RevalidatePostInput): string[] {
  const paths: string[] = [];
  const add = (path: string) => {
    revalidateUrl(path);
    paths.push(path);
  };

  revalidatePath('/(site)/news', 'layout');
  paths.push('/news/**');
  for (const p of [...PAGES_WITH_RECENT_POSTS, ...FEEDS]) add(p);

  const slugs = Array.from(new Set([input.slug, input.oldSlug].filter(Boolean) as string[]));
  const structure = input.structure ?? 'category';
  const categories = Array.from(new Set([input.categorySlug, input.oldCategorySlug].filter(Boolean) as string[]));
  if (categories.length === 0) categories.push('uncategorized');
  const urls = new Set<string>();
  for (const category of categories) {
    for (const slug of slugs) urls.add(postPath(slug, category, structure));
  }
  for (const url of urls) add(url);
  return paths;
}

// Tell IndexNow (Bing, Yandex, Seznam, Naver, Yep) about the changed URLs.
// Best effort: never throws.
export async function pingIndexNow(input: { slug: string; categorySlug: string | null; structure: PostUrlStructure }): Promise<void> {
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL || '';
  if (!siteBase || !process.env.INDEXNOW_KEY) return;
  const category = input.categorySlug || 'uncategorized';
  try {
    const result = await notifyIndexNow([
      `${siteBase}${postPath(input.slug, category, input.structure)}`,
      `${siteBase}/news`,
      `${siteBase}/news/category/${category}`,
    ]);
    if (!result.ok) console.error('[indexnow] notification failed:', result.status, result.error);
  } catch (error) {
    console.error('[indexnow] notification error:', error);
  }
}
