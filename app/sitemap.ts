import siteContent from '@/lib/content.json'
import { MetadataRoute } from 'next'
import type { DbClient } from '@/lib/db/server';
import { createServiceClient } from '@/lib/db/server'
import { getAuthorSegmentsWithPosts } from '@/lib/blog/listing'
import { SITE_URL as siteUrl } from '@/lib/seo'
import { postPath } from '@/lib/blog/postUrl';
import { getPostUrlStructure } from '@/lib/blog/postUrlStructure';

// Dynamic XML sitemap: every indexable page, with posts, categories, tags
// and author archives read from the database. Refreshed hourly and on every

// Read from the database on every request (no ISR cache is configured).
export const dynamic = 'force-dynamic';
// publish (lib/blog/revalidate.ts). Noindexed pages (admin, the GDPR request
// form, 404s) and paginated archive pages are left out.

// lastmod for static pages: the deploy that last changed them. Set at build
// time in next.config.mjs, so it stays stable between deploys instead of
// reporting "now" on every regeneration.
const buildDate = new Date(process.env.NEXT_PUBLIC_BUILD_DATE || '2026-01-01T00:00:00Z')

interface PostRow {
  slug: string
  updated_at: string | null
  published_at: string | null
  category_id: string | null
  author_id: string | null
  canonical_url: string | null
}

// All live posts, paged past PostgREST's 1000-row response limit.
async function getLivePosts(db: DbClient): Promise<PostRow[]> {
  const now = new Date().toISOString()
  const rows: PostRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('posts')
      .select('slug, updated_at, published_at, category_id, author_id, canonical_url')
      .eq('status', 'published')
      .lte('published_at', now)
      .order('published_at', { ascending: false })
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...((data || []) as PostRow[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

function stamp(p: { updated_at: string | null; published_at: string | null }): Date {
  return new Date(p.updated_at || p.published_at || 0)
}

// A post whose canonical points to another site is not ours to list.
function isSelfCanonical(p: PostRow): boolean {
  return !p.canonical_url || p.canonical_url.replace(/\/+$/, '').startsWith(siteUrl)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const page = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' | 'yearly' | 'daily') => ({
    url: path ? `${siteUrl}${path}` : siteUrl,
    lastModified: buildDate,
    changeFrequency,
    priority,
  })

  // Add the site's own static pages here.
  const staticPages = [
    // The site's own pages. Posts and archives come from the CMS below.
    page('', 1, 'weekly'),
    page('/contact/', 0.8, 'monthly'),
    page('/terms/', 0.3, 'yearly'),
    page('/news/', 0.9, 'daily'),
    ...Object.entries((siteContent as { pages: Record<string, { blocks?: unknown }> }).pages)
      .filter(([, p]) => p.blocks)
      .map(([slug]) => page(`/${slug}/`, 0.8, 'monthly')),
  ]

  try {
    const db = createServiceClient()
    const posts = await getLivePosts(db)
    if (posts.length === 0) return [...staticPages]

    const [{ data: categories }, { data: tags }, { data: postTags }] = await Promise.all([
      db.from('categories').select('id, slug'),
      db.from('tags').select('id, slug'),
      db.from('post_tags').select('tag_id, posts(slug, status, published_at, updated_at)'),
    ])
    const structure = await getPostUrlStructure()
    const categorySlug = new Map(((categories || []) as Array<{ id: string; slug: string }>).map((c) => [c.id, c.slug]))

    const blogPosts = posts.filter(isSelfCanonical).map((post) => ({
      url: `${siteUrl}${postPath(post.slug, post.category_id ? categorySlug.get(post.category_id) : undefined, structure)}`,
      lastModified: stamp(post),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    // Categories with at least one live post; lastmod = their newest post.
    const latestPerCategory = new Map<string, Date>()
    for (const post of posts) {
      if (!post.category_id) continue
      const s = stamp(post)
      const current = latestPerCategory.get(post.category_id)
      if (!current || s > current) latestPerCategory.set(post.category_id, s)
    }
    const categoryPages = Array.from(latestPerCategory.entries())
      .filter(([id]) => categorySlug.has(id))
      .map(([id, lastModified]) => ({
        url: `${siteUrl}/news/category/${categorySlug.get(id)}/`,
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))

    // Tags with at least one live post; lastmod = their newest live post.
    const now = Date.now()
    const latestPerTag = new Map<string, Date>()
    type TagJoin = { tag_id: string; posts: { status: string; published_at: string | null; updated_at: string | null } | null }
    for (const pt of (postTags || []) as unknown as TagJoin[]) {
      const p = pt.posts
      if (!p || p.status !== 'published' || !p.published_at || new Date(p.published_at).getTime() > now) continue
      const s = stamp(p)
      const current = latestPerTag.get(pt.tag_id)
      if (!current || s > current) latestPerTag.set(pt.tag_id, s)
    }
    const tagSlug = new Map(((tags || []) as Array<{ id: string; slug: string }>).map((t) => [t.id, t.slug]))
    const tagPages = Array.from(latestPerTag.entries())
      .filter(([id]) => tagSlug.has(id))
      .map(([id, lastModified]) => ({
        url: `${siteUrl}/news/tag/${tagSlug.get(id)}/`,
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      }))

    // Author archive pages; lastmod = the author's latest post.
    const authorPages = (await getAuthorSegmentsWithPosts()).map((a) => ({
      url: `${siteUrl}/news/author/${encodeURIComponent(a.segment)}/`,
      lastModified: a.lastModified ? new Date(a.lastModified) : buildDate,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))

    // The blog index changes whenever a post does.
    const newest = posts.reduce((acc, p) => (stamp(p) > acc ? stamp(p) : acc), new Date(0))
    const blogIndex = staticPages.find((p) => p.url === `${siteUrl}/news/`)
    if (blogIndex && newest.getTime() > 0) blogIndex.lastModified = newest

    return [...staticPages, ...blogPosts, ...categoryPages, ...tagPages, ...authorPages]
  } catch (err) {
    console.error('[Sitemap] Failed to fetch posts:', err)
    return [...staticPages]
  }
}
