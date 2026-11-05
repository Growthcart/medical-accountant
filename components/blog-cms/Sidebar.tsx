import Link from 'next/link';
import { createServiceClient } from '@/lib/db/server';
import { formatDateShort } from '@/lib/utils';
import { postPath } from '@/lib/blog/postUrl';
import { getPostUrlStructure } from '@/lib/blog/postUrlStructure';

// Server component: featured posts + tags are fetched at render time
// so the internal links ship in the HTML. Google's AI optimisation guide
// requires publicly accessible, crawlable content — a client-only sidebar
// rendered an empty shell to crawlers and AI engines.

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface FeaturedPost {
  id: string;
  title: string;
  slug: string;
  published_at: string | null;
  href: string;
}

async function getSidebarData(excludeId?: string): Promise<{ tags: Tag[]; featuredPosts: FeaturedPost[] }> {
  try {
    const db = createServiceClient();
    const structure = await getPostUrlStructure();
    const now = new Date().toISOString();

    const [categoriesResult, tagsResult, featuredResult] = await Promise.all([
      db.from('categories').select('id, slug'),
      db.from('tags').select('id, name, slug').limit(20),
      db
        .from('posts')
        .select('id, title, slug, published_at, category_id')
        .eq('status', 'published')
        .eq('is_featured', true)
        .lte('published_at', now)
        .order('published_at', { ascending: false })
        .limit(6),
    ]);

    const categorySlugMap = new Map<string, string>();
    for (const cat of categoriesResult.data ?? []) {
      categorySlugMap.set(cat.id, cat.slug);
    }

    const tags = (tagsResult.data ?? []) as Tag[];
    const featuredPosts: FeaturedPost[] = (featuredResult.data ?? [])
      .filter((p: any) => p.id !== excludeId)
      .slice(0, 5)
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        published_at: p.published_at,
        href: postPath(p.slug, p.category_id ? categorySlugMap.get(p.category_id) : null, structure),
      }));

    return { tags, featuredPosts };
  } catch (err) {
    console.error('[Sidebar] Failed to fetch sidebar data:', err);
    return { tags: [], featuredPosts: [] };
  }
}

export default async function Sidebar({
  showTags = true,
  excludeId,
}: {
  showTags?: boolean;
  excludeId?: string;
} = {}): Promise<React.ReactElement> {
  const { tags, featuredPosts } = await getSidebarData(excludeId);

  return (
    <aside aria-label="Blog Sidebar" className="w-full space-y-6">
      {/* Featured Articles Widget */}
      {featuredPosts.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          {/* Top subtle decorative accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500" />

          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-orange-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Featured Stories
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              Top Picks
            </span>
          </div>

          <ol className="space-y-4">
            {featuredPosts.map((post, idx) => (
              <li
                key={post.id}
                className="group relative flex items-start gap-3.5 pb-3.5 border-b border-gray-100 last:border-0 last:pb-0"
              >
                {/* Number ranking pill */}
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-orange-50 text-[11px] font-bold text-orange-600 transition-colors group-hover:bg-orange-500 group-hover:text-white">
                  {String(idx + 1).padStart(2, '0')}
                </span>

                <div className="flex-1 min-w-0">
                  <Link href={post.href} className="block focus:outline-none">
                    <span className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 transition-colors duration-150 group-hover:text-orange-600">
                      {post.title}
                    </span>
                  </Link>

                  {post.published_at && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                      <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <time dateTime={post.published_at}>
                        {formatDateShort(post.published_at)}
                      </time>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Explore Tags Cloud Widget */}
      {showTags && tags.length > 0 && (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Explore Topics
            </h4>
            <span className="text-[11px] font-medium text-gray-400">
              {tags.length} Tags
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/news/tag/${tag.slug}`}
                className="group inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-1.5 text-xs font-medium text-gray-700 transition-all duration-150 hover:border-orange-500/40 hover:bg-orange-50 hover:text-orange-600 hover:-translate-y-0.5"
              >
                <span className="text-gray-400 group-hover:text-orange-500 font-normal">#</span>
                <span>{tag.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
