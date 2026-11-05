import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/db/server'
import { SITE_URL } from '@/lib/seo'
import { postPath } from '@/lib/blog/postUrl';
import { getPostUrlStructure } from '@/lib/blog/postUrlStructure';

// Read from the database on every request (no ISR cache is configured).
export const dynamic = 'force-dynamic';

// RSS 2.0 feed of the latest blog posts, at /feed.xml (the old /api/rss
// 308s here; /api/ is disallowed in robots.txt). Refreshed hourly and on
// every publish (lib/blog/revalidate.ts).

interface FeedPost {
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  featured_image_url: string | null
  published_at: string
  updated_at: string | null
  categories: { name: string; slug: string } | null
  profiles: { full_name: string | null } | null
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// CDATA cannot contain "]]>"; split it if a post ever does.
function cdata(text: string): string {
  return `<![CDATA[${text.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

// Root-relative links and images in post HTML made absolute for feed readers.
function absolutize(html: string): string {
  return html.replace(/(\s(?:href|src)=["'])\/(?!\/)/g, `$1${SITE_URL}/`)
}

function imageType(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'avif') return 'image/avif'
  return 'image/webp'
}

export async function GET(): Promise<NextResponse> {
  const { data } = await createServiceClient()
    .from('posts')
    .select('title, slug, excerpt, content, featured_image_url, published_at, updated_at, categories(name, slug), profiles(full_name)')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(50)
  const posts = (data || []) as unknown as FeedPost[]
  const structure = await getPostUrlStructure()

  const items = posts
    .map((post) => {
      const url = `${SITE_URL}${postPath(post.slug, post.categories?.slug, structure)}`
      const image = post.featured_image_url
        ? post.featured_image_url.startsWith('/') ? `${SITE_URL}${post.featured_image_url}` : post.featured_image_url
        : null
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.excerpt || '')}</description>
      ${post.content ? `<content:encoded>${cdata(absolutize(post.content))}</content:encoded>` : ''}
      ${post.profiles?.full_name ? `<dc:creator>${escapeXml(post.profiles.full_name)}</dc:creator>` : ''}
      ${post.categories?.name ? `<category>${escapeXml(post.categories.name)}</category>` : ''}
      ${image ? `<media:content url="${escapeXml(image)}" medium="image" type="${imageType(image)}" />` : ''}
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
    </item>`
    })
    .join('')

  const lastBuild = posts[0] ? new Date(posts[0].updated_at || posts[0].published_at).toUTCString() : new Date().toUTCString()
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>MedicalAccountant.ie Blog</title>
    <link>${SITE_URL}/news</link>
    <description>Latest articles from MedicalAccountant.ie.</description>
    <language>en-ie</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
