// Every post lives at /{slug}/ , the WordPress-style root address the site's posts already had, so existing links and
// search results keep working. The admin's "post URL structure" setting is kept for type compatibility but no longer
// changes anything. Pure helpers, safe in server and client code.
import content from '@/lib/content.json';

export type PostUrlStructure = 'category' | 'flat';

export const POSTS_BASE = '';
export const DEFAULT_POST_URL_STRUCTURE: PostUrlStructure = 'flat';

// Post slugs share the root with the site's own pages and the CMS routes, so these can never be a post slug.
export const RESERVED_POST_SLUGS = [
  'admin', 'api', 'files', 'og', 'well-known', 'news', 'contact', 'terms', 'thank-you',
  'feed', 'sitemap', 'robots', 'llms', 'llms-full', 'image-sitemap', 'indexnow-key',
  'page', 'tag', 'category', 'author',
  ...Object.keys((content as { pages: Record<string, unknown> }).pages),
];

export function normaliseStructure(value: unknown): PostUrlStructure {
  return value === 'category' ? 'category' : DEFAULT_POST_URL_STRUCTURE;
}

export function postPath(
  slug: string,
  _categorySlug?: string | null,
  _structure?: PostUrlStructure,
): string {
  return `/${slug}/`;
}
