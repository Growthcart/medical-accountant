import Link from 'next/link';
import { BLOG_ACCENT, formatShortDate, plain } from '@/lib/blog/format';
import { postHref, type FeaturedStripPost } from '@/lib/blog/listing';

// Compact row of four featured articles: category label over a thin rule,
// underlined title, then author and date. Sits inside the archive hero.
export default function FeaturedPostsStrip({ posts }: { posts: FeaturedStripPost[] }) {
  const items = posts.slice(0, 4);
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-10 lg:grid-cols-4" aria-label="Featured posts">
      {items.map((post) => (
        <article key={post.id} className="flex flex-col border-t border-gray-300 pt-3">
          {post.category && (
            <Link
              href={`/news/category/${post.category.slug}`}
              className="mb-3 block text-[11px] font-bold uppercase tracking-wider hover:underline"
              style={{ color: BLOG_ACCENT }}
            >
              {post.category.name}
            </Link>
          )}
          <h3 className="text-[15px] font-bold leading-snug text-gray-900">
            <Link href={postHref(post)} className="underline decoration-1 underline-offset-2 transition-colors hover:text-gray-700">
              {plain(post.title)}
            </Link>
          </h3>
          <div className="mt-3 text-sm text-gray-500">
            {post.authorName} &middot; {formatShortDate(post.published_at)}
          </div>
        </article>
      ))}
    </div>
  );
}
