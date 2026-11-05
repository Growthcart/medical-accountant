import PostCard from '@/components/PostCard';
import { plain } from '@/lib/blog/format';
import type { ArchivePost } from '@/lib/blog/listing';

// The site's own news card (components/PostCard.js), fed from a CMS post.
export function ArchiveCard({ post }: { post: ArchivePost }) {
  return (
    <PostCard
      post={{
        slug: post.slug,
        title: plain(post.title),
        description: plain(post.excerpt),
        image: post.featured_image_url || '',
        imageAlt: post.featured_image_alt || plain(post.title),
        date: post.published_at.slice(0, 10),
      }}
    />
  );
}

export function CardGrid({ posts }: { posts: ArchivePost[] }) {
  return (
    <ul className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <ArchiveCard key={post.id} post={post} />
      ))}
    </ul>
  );
}
