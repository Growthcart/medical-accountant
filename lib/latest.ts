import { createServiceClient } from '@/lib/db/server';
import content from '@/lib/content.json';

export interface CardPost {
  slug: string;
  title: string;
  description: string;
  image: string;
  imageAlt?: string;
  date: string;
}

// Newest published posts from the CMS, shaped for components/PostCard.js. Falls back to the posts in
// lib/content.json when the database has none yet or cannot be read (for example during `next build`).
export async function latestPosts(limit: number): Promise<CardPost[]> {
  try {
    const { data, error } = await createServiceClient()
      .from('posts')
      .select('slug, title, excerpt, featured_image_url, featured_image_alt, published_at')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error || !data || data.length === 0) throw error ?? new Error('no posts');
    return (data as { slug: string; title: string; excerpt: string | null; featured_image_url: string | null; featured_image_alt: string | null; published_at: string }[]).map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.excerpt ?? '',
      image: p.featured_image_url ?? '',
      imageAlt: p.featured_image_alt ?? p.title,
      date: p.published_at.slice(0, 10),
    }));
  } catch {
    return (content as { posts: CardPost[] }).posts.slice(0, limit);
  }
}
