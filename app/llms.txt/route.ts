import { createServiceClient } from '@/lib/db/server'
import { SITE_URL as siteUrl } from '@/lib/seo'
import { SITE_NAME } from '@/lib/seo'
import { postPath } from '@/lib/blog/postUrl';
import { getPostUrlStructure } from '@/lib/blog/postUrlStructure';

// Read from the database on every request (no ISR cache is configured).
export const dynamic = 'force-dynamic';


export async function GET() {
  const db = createServiceClient()

  // Fetch published blog posts with categories
  let blogSection = ''
  try {
    const now = new Date().toISOString()
    const { data: posts } = await db
      .from('posts')
      .select('title, slug, excerpt, category_id, published_at')
      .eq('status', 'published')
      .lte('published_at', now)
      .order('published_at', { ascending: false })
      .limit(50)

    if (posts && posts.length > 0) {
      const categoryIds = [...new Set(posts.map((p: any) => p.category_id).filter(Boolean))] as string[]
      let categoryMap: Record<string, { name: string; slug: string }> = {}

      if (categoryIds.length > 0) {
        const { data: cats } = await db
          .from('categories')
          .select('id, name, slug')
          .in('id', categoryIds)
        if (cats) {
          categoryMap = Object.fromEntries(cats.map((c: any) => [c.id, { name: c.name, slug: c.slug }]))
        }
      }

      // Get unique categories for category listing
      const { data: allCategories } = await db
        .from('categories')
        .select('name, slug')
        .order('name')

      const categoryLinks = allCategories?.map(
        (c: any) => `- [${c.name}](${siteUrl}/news/category/${c.slug}): Browse all ${c.name.toLowerCase()} articles`
      ).join('\n') || ''

      const structure = await getPostUrlStructure()
      const postLinks = posts.map((post: any) => {
        const catSlug = post.category_id ? categoryMap[post.category_id]?.slug : undefined
        const desc = post.excerpt ? `: ${post.excerpt.slice(0, 120).replace(/\n/g, ' ')}` : ''
        return `- [${post.title}](${siteUrl}${postPath(post.slug, catSlug, structure)})${desc}`
      }).join('\n')

      blogSection = `

## Blog Categories

${categoryLinks}

## Recent Blog Posts

${postLinks}`
    }
  } catch (err) {
    console.error('[llms.txt] Failed to fetch posts:', err)
  }

  const content = `# ${SITE_NAME}

> Replace with a one-paragraph description of the site for LLMs.

## Pages

- [Blog](${siteUrl}/news): Latest articles.
${blogSection}
`

  return new Response(content.trim(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
