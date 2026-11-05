import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import TurndownService from 'turndown'
import { createServiceClient } from '@/lib/db/server'
import { getSiteUrl } from '@/lib/getSiteUrl'
import { postPath, RESERVED_POST_SLUGS, type PostUrlStructure } from '@/lib/blog/postUrl'
import { getPostUrlStructure } from '@/lib/blog/postUrlStructure'

// Markdown for Agents — single endpoint that returns a markdown version
// of any page on the site. The middleware rewrites every GET request
// carrying `Accept: text/markdown` here, passing the original path via
// the `path` query string.
//
// Three rendering strategies, picked by path:
//   1. Blog post  (/{category}/{slug})   → DB fetch + turndown(stored HTML)
//   2. Blog list  (/news, /news/category/X, /news/tag/X) → DB fetch + format
//                                            as a markdown list with links.
//   3. Anything else (home, services, about, etc.) → internal HTTP fetch of
//      the rendered HTML + cheerio strip nav/footer/scripts + turndown.
//
// All three paths return Content-Type: text/markdown, set x-markdown-tokens,
// and emit Vary: Accept so caches don't poison the HTML response with MD.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// A post is a single root segment (/{post}/) that is not one of the site's own pages or CMS routes.
function isBlogPostPath(path: string): { postSlug: string } | null {
  const parts = path.replace(/^\/+|\/+$/g, '').split('/')
  if (parts.length !== 1 || !parts[0] || RESERVED_POST_SLUGS.includes(parts[0])) return null
  return { postSlug: parts[0] }
}

function escapeYaml(s: string): string {
  return s.replace(/"/g, '\\"')
}

function buildTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '_',
    bulletListMarker: '-',
  })
  // Cast: @types/turndown narrows to HTMLElementTagNameMap which doesn't
  // include `svg`, but the runtime accepts any string.
  td.remove(['script', 'style', 'noscript', 'svg', 'iframe'] as unknown as Parameters<typeof td.remove>[0])
  return td
}

function markdownResponse(body: string, extraHeaders: Record<string, string> = {}): NextResponse {
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'x-markdown-tokens': String(Math.ceil(body.length / 4)),
      Vary: 'Accept',
      ...extraHeaders,
    },
  })
}

// ─────────── 1. Blog post markdown ───────────

async function renderBlogPost(
  requestedPath: string,
  postSlug: string,
  siteUrl: string,
): Promise<NextResponse> {
  const db = createServiceClient()
  const { data: post } = await db
    .from('posts')
    .select(
      'id, title, excerpt, content, slug, published_at, updated_at, canonical_url, categories(name, slug), profiles(full_name, linkedin_url, twitter_handle)',
    )
    .eq('slug', postSlug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle()

  if (!post) return new NextResponse('Post not found', { status: 404 })

  const category = post.categories as { name: string; slug: string } | null
  // Only the canonical URL answers; the HTML route redirects the others.
  const path = postPath(postSlug, category?.slug, await getPostUrlStructure())
  if (requestedPath.replace(/\/+$/, '') !== path) {
    return new NextResponse('Post not found', { status: 404 })
  }

  const profile = post.profiles as {
    full_name: string | null
    linkedin_url: string | null
    twitter_handle: string | null
  } | null
  const author = profile?.full_name || 'MedicalAccountant.ie'
  const postUrl = (post as { canonical_url?: string | null }).canonical_url
    || `${siteUrl}${path}`

  const { data: postTagRows } = await db
    .from('post_tags')
    .select('tags(name)')
    .eq('post_id', (post as { id: string }).id)
  const tags = (postTagRows || [])
    .map((row: any) => (row as { tags: { name: string } | null }).tags?.name)
    .filter((n: any): n is string => Boolean(n))

  const td = buildTurndown()
  const bodyMd = post.content ? td.turndown(post.content as string) : ''

  const frontMatter = [
    '---',
    `title: "${escapeYaml(post.title as string)}"`,
    post.excerpt ? `description: "${escapeYaml(post.excerpt as string)}"` : null,
    `author: "${escapeYaml(author)}"`,
    profile?.linkedin_url ? `author_linkedin: "${profile.linkedin_url}"` : null,
    profile?.twitter_handle ? `author_twitter: "${profile.twitter_handle.replace(/^@/, '')}"` : null,
    category ? `category: "${escapeYaml(category.name)}"` : null,
    post.published_at ? `published: "${post.published_at}"` : null,
    post.updated_at ? `updated: "${post.updated_at}"` : null,
    tags.length > 0 ? `tags: [${tags.map((t: any) => `"${escapeYaml(t)}"`).join(', ')}]` : null,
    `canonical: "${postUrl}"`,
    `source: "${postUrl}"`,
    `publisher: "MedicalAccountant.ie"`,
    '---',
    '',
  ]
    .filter(Boolean)
    .join('\n')

  const md = `${frontMatter}# ${post.title}\n\n${bodyMd}\n`
  return markdownResponse(md, { Link: `<${postUrl}>; rel="canonical"` })
}

// ─────────── 2. Blog list pages markdown ───────────

interface ListPostRow {
  title: string
  slug: string
  excerpt: string | null
  published_at: string | null
  category_id: string | null
}

async function fetchPostList(
  filter: { categoryId?: string; tagId?: string } | null,
  limit = 50,
): Promise<{ posts: ListPostRow[]; categoryMap: Record<string, { name: string; slug: string }> }> {
  const db = createServiceClient()
  const now = new Date().toISOString()
  let query = db
    .from('posts')
    .select('title, slug, excerpt, published_at, category_id')
    .eq('status', 'published')
    .lte('published_at', now)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (filter?.categoryId) query = query.eq('category_id', filter.categoryId)
  let postIds: string[] | null = null
  if (filter?.tagId) {
    const { data: ids } = await db
      .from('post_tags')
      .select('post_id')
      .eq('tag_id', filter.tagId)
    postIds = ((ids || []) as { post_id: string }[]).map((row) => row.post_id)
    if (postIds.length === 0) return { posts: [], categoryMap: {} }
    query = query.in('id', postIds)
  }

  const { data } = await query
  const posts = (data || []) as ListPostRow[]
  const catIds = [...new Set(posts.map((p) => p.category_id).filter(Boolean))] as string[]
  let categoryMap: Record<string, { name: string; slug: string }> = {}
  if (catIds.length > 0) {
    const { data: cats } = await db
      .from('categories')
      .select('id, name, slug')
      .in('id', catIds)
    categoryMap = Object.fromEntries(
      (cats || []).map((c: any) => [(c as { id: string }).id, { name: (c as { name: string }).name, slug: (c as { slug: string }).slug }]),
    )
  }
  return { posts, categoryMap }
}

function formatPostListAsMarkdown(
  posts: ListPostRow[],
  categoryMap: Record<string, { name: string; slug: string }>,
  siteUrl: string,
  structure: PostUrlStructure,
): string {
  if (posts.length === 0) return '_No posts found._\n'
  return posts
    .map((p) => {
      const catSlug = p.category_id ? categoryMap[p.category_id]?.slug : undefined
      const url = `${siteUrl}${postPath(p.slug, catSlug, structure)}`
      const date = p.published_at ? p.published_at.slice(0, 10) : ''
      const excerpt = p.excerpt ? `: ${p.excerpt}` : ''
      return `- [${p.title}](${url})${date ? ` _(${date})_` : ''}${excerpt}`
    })
    .join('\n')
}

async function renderBlogIndex(siteUrl: string, pageUrl: string): Promise<NextResponse> {
  const { posts, categoryMap } = await fetchPostList(null)
  const front =
    '---\n' +
    `title: "Blog"\n` +
    `description: "Latest blog posts and articles from MedicalAccountant.ie"\n` +
    `canonical: "${pageUrl}"\n` +
    '---\n\n'
  const list = formatPostListAsMarkdown(posts, categoryMap, siteUrl, await getPostUrlStructure())
  return markdownResponse(`${front}# Blog\n\n${list}\n`, { Link: `<${pageUrl}>; rel="canonical"` })
}

async function renderCategory(
  categorySlug: string,
  siteUrl: string,
  pageUrl: string,
): Promise<NextResponse> {
  const db = createServiceClient()
  const { data: category } = await db
    .from('categories')
    .select('id, name, description, slug')
    .eq('slug', categorySlug)
    .maybeSingle()
  if (!category) return new NextResponse('Category not found', { status: 404 })

  const { posts, categoryMap } = await fetchPostList({ categoryId: (category as { id: string }).id })
  const front =
    '---\n' +
    `title: "${escapeYaml((category as { name: string }).name)}"\n` +
    ((category as { description: string | null }).description
      ? `description: "${escapeYaml((category as { description: string | null }).description!)}"\n`
      : '') +
    `canonical: "${pageUrl}"\n---\n\n`
  const list = formatPostListAsMarkdown(posts, categoryMap, siteUrl, await getPostUrlStructure())
  return markdownResponse(`${front}# ${(category as { name: string }).name}\n\n${list}\n`, {
    Link: `<${pageUrl}>; rel="canonical"`,
  })
}

async function renderTag(tagSlug: string, siteUrl: string, pageUrl: string): Promise<NextResponse> {
  const db = createServiceClient()
  const { data: tag } = await db
    .from('tags')
    .select('id, name, slug')
    .eq('slug', tagSlug)
    .maybeSingle()
  if (!tag) return new NextResponse('Tag not found', { status: 404 })

  const { posts, categoryMap } = await fetchPostList({ tagId: (tag as { id: string }).id })
  const front =
    '---\n' +
    `title: "Tag: ${escapeYaml((tag as { name: string }).name)}"\n` +
    `canonical: "${pageUrl}"\n---\n\n`
  const list = formatPostListAsMarkdown(posts, categoryMap, siteUrl, await getPostUrlStructure())
  return markdownResponse(`${front}# Tag: ${(tag as { name: string }).name}\n\n${list}\n`, {
    Link: `<${pageUrl}>; rel="canonical"`,
  })
}

// ─────────── 3. Anything else: HTML fetch + strip + turndown ───────────

async function renderGenericPage(path: string, siteUrl: string): Promise<NextResponse> {
  const target = `${siteUrl}${path}`
  let html: string
  try {
    const res = await fetch(target, {
      headers: {
        Accept: 'text/html',
        // Identifies the recursive fetch so we can short-circuit in middleware
        // and avoid any potential loop, even though Accept already breaks it.
        'x-markdown-internal': '1',
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      return new NextResponse(`Upstream returned ${res.status}`, { status: res.status })
    }
    html = await res.text()
  } catch (err) {
    return new NextResponse(
      `Failed to fetch source page: ${err instanceof Error ? err.message : String(err)}`,
      { status: 502 },
    )
  }

  const $ = cheerio.load(html)
  // Strip chrome that's irrelevant to the page's content.
  $('header, nav, footer, script, style, noscript, [aria-hidden="true"], svg, iframe').remove()
  // Strip the cookie banner / tracking body scripts wrapper if any leak through.
  $('[data-cookie-consent], [data-tracking-body]').remove()

  // Extract a sensible content root.
  const root = $('main').first().length ? $('main').first() : $('body')
  const rootHtml = root.html() || ''

  // Page metadata pulled from head (title, description, canonical).
  const title = ($('title').first().text() || '').trim()
  const description =
    ($('meta[name="description"]').attr('content') || '').trim() ||
    ($('meta[property="og:description"]').attr('content') || '').trim()
  const canonical = ($('link[rel="canonical"]').attr('href') || target).trim()

  const td = buildTurndown()
  const bodyMd = td.turndown(rootHtml).trim()

  const front = [
    '---',
    title ? `title: "${escapeYaml(title)}"` : null,
    description ? `description: "${escapeYaml(description)}"` : null,
    `canonical: "${canonical}"`,
    `source: "${canonical}"`,
    `publisher: "MedicalAccountant.ie"`,
    '---',
    '',
  ]
    .filter(Boolean)
    .join('\n')

  return markdownResponse(`${front}${bodyMd}\n`, { Link: `<${canonical}>; rel="canonical"` })
}

// ─────────── Router ───────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestedPath =
    req.headers.get('x-md-path') || req.nextUrl.searchParams.get('path') || '/'
  if (!requestedPath.startsWith('/')) {
    return new NextResponse('Invalid path', { status: 400 })
  }

  const siteUrl = await getSiteUrl()
  const pageUrl = `${siteUrl}${requestedPath === '/' ? '' : requestedPath}`

  // Blog list pages — DB lookup, formatted output.
  if (requestedPath === '/news' || requestedPath === '/news/') {
    return renderBlogIndex(siteUrl, pageUrl)
  }
  const categoryMatch = requestedPath.match(/^\/news\/category\/([^/]+)\/?$/)
  if (categoryMatch) return renderCategory(categoryMatch[1], siteUrl, pageUrl)
  const tagMatch = requestedPath.match(/^\/news\/tag\/([^/]+)\/?$/)
  if (tagMatch) return renderTag(tagMatch[1], siteUrl, pageUrl)

  // Blog post — DB lookup, body conversion.
  const blogPost = isBlogPostPath(requestedPath)
  if (blogPost) return renderBlogPost(requestedPath, blogPost.postSlug, siteUrl)

  // Anything else — fetch the rendered HTML and turndown the <main> region.
  return renderGenericPage(requestedPath, siteUrl)
}
