import Link from 'next/link'
import Image from 'next/image'
import { createServiceClient } from '@/lib/db/server'
import { postPath } from '@/lib/blog/postUrl';
import { getPostUrlStructure } from '@/lib/blog/postUrlStructure';

interface Post {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featured_image_url: string | null
  featured_image_alt: string | null
  published_at: string | null
  category: { name: string; slug: string } | null
  href: string
}

function formatDate(dateString: string | null): string | null {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return null
    return date.toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

async function getRecentPosts(): Promise<Post[]> {
  const db = createServiceClient()
  const structure = await getPostUrlStructure()

  try {
    const now = new Date().toISOString()
    const { data: postsData } = await db
      .from('posts')
      .select('id, title, slug, excerpt, featured_image_url, featured_image_alt, published_at, category_id')
      .eq('status', 'published')
      .lte('published_at', now)
      .order('published_at', { ascending: false })
      .limit(4)

    if (!postsData || postsData.length === 0) return []

    // Fetch categories
    const categoryIds = [...new Set(postsData.map((p: any) => p.category_id).filter(Boolean))] as string[]
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

    return postsData.map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      featured_image_url: p.featured_image_url,
      featured_image_alt: p.featured_image_alt,
      published_at: p.published_at,
      category: p.category_id ? categoryMap[p.category_id] || null : null,
      href: postPath(p.slug, p.category_id ? categoryMap[p.category_id]?.slug : null, structure),
    }))
  } catch (err) {
    console.error('[RecentPosts] Failed to fetch posts:', err)
    return []
  }
}

export async function RecentPosts(): Promise<React.ReactElement | null> {
  const posts = await getRecentPosts()

  if (posts.length === 0) {
    return null
  }

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="reveal-up flex items-center justify-between mb-12" data-reveal>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Latest Insights
            </h2>
            <p className="mt-2 text-lg text-gray-600">
              Stay updated with our latest articles and guides
            </p>
          </div>
          <Link
            href="/news"
            className="hidden md:inline-flex items-center gap-2 text-orange-500 font-semibold hover:text-orange-600 transition-colors"
          >
            View all posts
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {posts.map((post, index) => (
            <article
              key={post.id}
              className="reveal-up group"
              data-reveal
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <Link href={post.href} className="block">
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg mb-4 bg-gray-100">
                  {post.featured_image_url ? (
                    <Image
                      src={post.featured_image_url}
                      alt={post.featured_image_alt || post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                      <svg
                        className="w-12 h-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Category */}
                {post.category && (
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {post.category.name}
                  </span>
                )}

                {/* Title */}
                <h3 className="mt-2 text-lg font-bold text-gray-900 group-hover:text-orange-500 transition-colors line-clamp-2">
                  {post.title}
                </h3>

                {/* Date */}
                {post.published_at && (
                  <p className="mt-2 text-sm text-gray-500">
                    {formatDate(post.published_at)}
                  </p>
                )}
              </Link>
            </article>
          ))}
        </div>

        {/* Mobile View All Link */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-orange-500 font-semibold hover:text-orange-600 transition-colors"
          >
            View all posts
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
