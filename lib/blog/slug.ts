// URL slug from free text: lowercase ASCII words joined by hyphens, max 100
// chars. Used by the publishing API (and therefore the MCP tools).
import { RESERVED_POST_SLUGS } from './postUrl';

export function slugify(input: string): string {
  const slug = slugifyRaw(input);
  // Post slugs live at the site root, next to its own pages and the CMS routes.
  return RESERVED_POST_SLUGS.includes(slug) ? `${slug}-post` : slug;
}

function slugifyRaw(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}
