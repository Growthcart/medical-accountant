import { cache } from 'react';
import { postPath, type PostUrlStructure } from './postUrl';
import { getPostUrlStructure } from './postUrlStructure';
import { dbReadFailed } from '@/lib/dbReadError';
import { createServiceClient } from '@/lib/db/server';
import { authorSlug } from '@/lib/authors';
import { firstJoined, readMinutes, summaryFor } from './format';

// Data for the blog archive pages (/news, category, tag and author archives)
// and the "Other useful posts" row under an article. Page 1 of an archive
// opens with the newest posts in the hero, then the featured strip, then a
// grid of the rest; later pages hold grid posts only.

// The site's news has no separate hero row: every post is a card, 12 to a page.
export const ARCHIVE_HERO_COUNT = 0;
export const ARCHIVE_PAGE_SIZE = 12;
const FEATURED_COUNT = 4;
export const RELATED_POSTS_LIMIT = 4;

export interface ArchiveAuthor {
  name: string;
  // URL segment of the author archive (/news/author/{segment}), if any.
  segment: string | null;
  photo: string | null;
}

export interface ArchivePost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  published_at: string;
  reading_minutes: number;
  category: { name: string; slug: string } | null;
  author: ArchiveAuthor | null;
  /** Canonical post path under the admin's URL layout. */
  href: string;
}

export interface FeaturedStripPost {
  id: string;
  slug: string;
  title: string;
  published_at: string;
  category: { name: string; slug: string } | null;
  authorName: string;
  href: string;
}

export type ArchiveFilter =
  | { kind: 'all' }
  | { kind: 'category'; id: string }
  | { kind: 'tag'; id: string }
  | { kind: 'author'; id: string };

export interface ArchivePageData {
  hero: ArchivePost[];
  featured: FeaturedStripPost[];
  grid: ArchivePost[];
  page: number;
  totalPages: number;
  total: number;
}

interface ProfileRef {
  username?: string | null;
  full_name?: string | null;
  profile_photo_url?: string | null;
}

interface PostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  og_image: string | null;
  published_at: string;
  categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
  profiles: ProfileRef | ProfileRef[] | null;
}

const POST_SELECT =
  'id, slug, title, excerpt, content, featured_image_url, featured_image_alt, og_image, published_at, categories(name, slug), profiles(username, full_name, profile_photo_url)';

// The archive URL segment for an author: their username, else a slug of
// their name (profiles without a username still get an author page).
export function authorSegment(profile: ProfileRef | null | undefined): string | null {
  if (!profile) return null;
  if (profile.username?.trim()) return profile.username.trim();
  if (profile.full_name?.trim()) return authorSlug(profile.full_name);
  return null;
}

export function authorHref(profile: ProfileRef | null | undefined): string | null {
  const segment = authorSegment(profile);
  return segment ? `/news/author/${encodeURIComponent(segment)}` : null;
}

function toAuthor(profile: ProfileRef | null): ArchiveAuthor | null {
  if (!profile) return null;
  const name = profile.full_name || profile.username;
  if (!name) return null;
  return { name, segment: authorSegment(profile), photo: profile.profile_photo_url || null };
}

function toArchivePost(row: PostRow, structure: PostUrlStructure): ArchivePost {
  const category = firstJoined(row.categories);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: summaryFor(row),
    featured_image_url: row.featured_image_url || row.og_image || null,
    featured_image_alt: row.featured_image_alt,
    published_at: row.published_at,
    reading_minutes: readMinutes(row.content),
    category,
    author: toAuthor(firstJoined(row.profiles)),
    href: postPath(row.slug, category?.slug, structure),
  };
}

export function postHref(post: { href: string }): string {
  return post.href;
}

function pageRange(page: number, heroCount: number): [number, number] {
  if (page === 1) return [0, heroCount + ARCHIVE_PAGE_SIZE - 1];
  const from = heroCount + ARCHIVE_PAGE_SIZE * (page - 1);
  return [from, from + ARCHIVE_PAGE_SIZE - 1];
}

function totalPagesFor(count: number, heroCount: number): number {
  return Math.max(1, Math.ceil(Math.max(0, count - heroCount) / ARCHIVE_PAGE_SIZE));
}

function publishedPosts(select: string, options?: { count?: 'exact' }) {
  return createServiceClient()
    .from('posts')
    .select(select, options)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString());
}

async function getFeaturedStrip(
  filter: ArchiveFilter,
  exclude: Set<string>,
): Promise<FeaturedStripPost[]> {
  const select = 'id, slug, title, published_at, category_id, categories(name, slug), profiles(username, full_name)';
  const rows: Array<Record<string, unknown>> = [];
  // This category's featured posts first, topped up with site-wide ones.
  if (filter.kind === 'category') {
    const { data } = await publishedPosts(select)
      .eq('is_featured', true)
      .eq('category_id', filter.id)
      .order('published_at', { ascending: false })
      .limit(FEATURED_COUNT + ARCHIVE_HERO_COUNT);
    rows.push(...((data || []) as unknown as Array<Record<string, unknown>>));
  }
  const { data: siteWide } = await publishedPosts(select)
    .eq('is_featured', true)
    .order('published_at', { ascending: false })
    .limit(FEATURED_COUNT + ARCHIVE_HERO_COUNT);
  rows.push(...((siteWide || []) as unknown as Array<Record<string, unknown>>));

  const structure = await getPostUrlStructure();
  const seen = new Set(exclude);
  const out: FeaturedStripPost[] = [];
  for (const r of rows) {
    if (out.length >= FEATURED_COUNT) break;
    const id = r.id as string;
    if (seen.has(id)) continue;
    seen.add(id);
    const profile = firstJoined(r.profiles as ProfileRef | ProfileRef[] | null);
    const category = firstJoined(r.categories as { name: string; slug: string } | null);
    out.push({
      id,
      slug: r.slug as string,
      title: r.title as string,
      published_at: r.published_at as string,
      category,
      authorName: profile?.full_name || profile?.username || 'MedicalAccountant.ie',
      href: postPath(r.slug as string, category?.slug, structure),
    });
  }
  return out;
}

// One page of an archive. Cached per request so metadata and page share it
// (React's cache compares arguments by identity, hence the primitive key).
export function getArchivePage(
  filter: ArchiveFilter,
  page: number,
  options: { heroCount?: number; withFeatured?: boolean } = {},
): Promise<ArchivePageData> {
  return getArchivePageCached(
    filter.kind,
    filter.kind === 'all' ? '' : filter.id,
    page,
    options.heroCount ?? ARCHIVE_HERO_COUNT,
    options.withFeatured ?? false,
  );
}

const getArchivePageCached = cache(async (
  kind: ArchiveFilter['kind'],
  id: string,
  page: number,
  heroCount: number,
  withFeatured: boolean,
): Promise<ArchivePageData> => {
  const filter = (kind === 'all' ? { kind } : { kind, id }) as ArchiveFilter;
  const [from, to] = pageRange(page, heroCount);

  let query =
    filter.kind === 'tag'
      ? publishedPosts(`${POST_SELECT}, post_tags!inner(tag_id)`, { count: 'exact' }).eq('post_tags.tag_id', filter.id)
      : publishedPosts(POST_SELECT, { count: 'exact' });
  if (filter.kind === 'category') query = query.eq('category_id', filter.id);
  if (filter.kind === 'author') query = query.eq('author_id', filter.id);

  const { data, count, error } = await query.order('published_at', { ascending: false }).range(from, to);
  if (error) dbReadFailed('blog archive', error.message);
  const structure = await getPostUrlStructure();
  const posts = ((data || []) as unknown as PostRow[]).map((row) => toArchivePost(row, structure));

  const hero = page === 1 ? posts.slice(0, heroCount) : [];
  const featured =
    page === 1 && withFeatured && hero.length > 0
      ? await getFeaturedStrip(filter, new Set(hero.map((p) => p.id)))
      : [];
  const featuredIds = new Set(featured.map((p) => p.id));
  const grid = (page === 1 ? posts.slice(heroCount) : posts).filter((p) => !featuredIds.has(p.id));

  return { hero, featured, grid, page, totalPages: totalPagesFor(count || 0, heroCount), total: count || 0 };
});

// "Other useful posts" under an article: the newest posts in the same
// category, topped up with the newest posts overall.
export async function getRelatedPosts(postId: string, categoryId: string | null): Promise<ArchivePost[]> {
  const structure = await getPostUrlStructure();
  const out: ArchivePost[] = [];
  const seen = new Set<string>([postId]);
  const add = (rows: PostRow[]) => {
    for (const r of rows) {
      if (out.length >= RELATED_POSTS_LIMIT || seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(toArchivePost(r, structure));
    }
  };
  if (categoryId) {
    const { data } = await publishedPosts(POST_SELECT)
      .eq('category_id', categoryId)
      .neq('id', postId)
      .order('published_at', { ascending: false })
      .limit(RELATED_POSTS_LIMIT);
    add((data || []) as unknown as PostRow[]);
  }
  if (out.length < RELATED_POSTS_LIMIT) {
    const { data } = await publishedPosts(POST_SELECT)
      .neq('id', postId)
      .order('published_at', { ascending: false })
      .limit(RELATED_POSTS_LIMIT + 1);
    add((data || []) as unknown as PostRow[]);
  }
  return out;
}

export interface AuthorProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  website_url: string | null;
}

const AUTHOR_FULL_SELECT = 'id, username, full_name, profile_photo_url, bio, job_title, linkedin_url, twitter_handle, website_url';
const AUTHOR_BASE_SELECT = 'id, username, full_name, profile_photo_url, bio';

// Every author profile. Falls back to the original columns when the
// author-fields migration (job_title, linkedin_url, ...) has not been run.
async function allAuthorProfiles(): Promise<AuthorProfile[]> {
  const db = createServiceClient();
  let result = await db.from('profiles').select(AUTHOR_FULL_SELECT);
  if (result.error) {
    result = (await db.from('profiles').select(AUTHOR_BASE_SELECT)) as typeof result;
  }
  if (result.error) dbReadFailed('author profiles', result.error.message);
  return ((result.data || []) as Partial<AuthorProfile>[]).map((p) => ({
    id: p.id as string,
    username: p.username ?? null,
    full_name: p.full_name ?? null,
    profile_photo_url: p.profile_photo_url ?? null,
    bio: p.bio ?? null,
    job_title: p.job_title ?? null,
    linkedin_url: p.linkedin_url ?? null,
    twitter_handle: p.twitter_handle ?? null,
    website_url: p.website_url ?? null,
  }));
}

// The author for an archive URL segment (username, or slug of their name).
export const getAuthorBySegment = cache(async (segment: string): Promise<AuthorProfile | null> => {
  const wanted = decodeURIComponent(segment).toLowerCase();
  const profiles = await allAuthorProfiles();
  return (
    profiles.find((p) => p.username?.toLowerCase() === wanted) ||
    profiles.find((p) => !p.username && p.full_name && authorSlug(p.full_name) === wanted) ||
    null
  );
});

// Author segments for static generation and the sitemap: only authors with
// at least one published post.
export async function getAuthorSegmentsWithPosts(): Promise<Array<{ segment: string; lastModified: string | null }>> {
  const { data } = await createServiceClient()
    .from('posts')
    .select('author_id, updated_at, published_at')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString());
  const latest = new Map<string, string>();
  for (const row of (data || []) as Array<{ author_id: string | null; updated_at: string | null; published_at: string | null }>) {
    if (!row.author_id) continue;
    const stamp = row.updated_at || row.published_at || '';
    const prev = latest.get(row.author_id);
    if (!prev || stamp > prev) latest.set(row.author_id, stamp);
  }
  if (latest.size === 0) return [];
  const profiles = await allAuthorProfiles();
  return profiles
    .filter((p) => latest.has(p.id))
    .map((p) => ({ segment: authorSegment(p), lastModified: latest.get(p.id) || null }))
    .filter((p): p is { segment: string; lastModified: string | null } => Boolean(p.segment));
}
