// Post URLs are /{category}/{post}. These category slugs would put posts
// inside the admin area, the API or the blog's own archive URLs
// (/news/page/2, /news/tag/x, ...), so the admin refuses them. Slugs that
// match a service page (e.g. "seo") are fine: /seo/{post} does not clash.
export const RESERVED_CATEGORY_SLUGS = ['admin', 'api', 'blog', 'files', 'posts', 'well-known'];

export function isReservedCategorySlug(slug: string): boolean {
  return RESERVED_CATEGORY_SLUGS.includes(slug.trim().toLowerCase());
}
