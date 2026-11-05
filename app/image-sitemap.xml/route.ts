import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteUrl } from '@/lib/getSiteUrl';
import { postPath } from '@/lib/blog/postUrl';
import { getPostUrlStructure } from '@/lib/blog/postUrlStructure';

// Read from the database on every request (no ISR cache is configured).
export const dynamic = 'force-dynamic';


function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Absolute URL for an image src (sitemap URLs must be absolute).
function absoluteImageUrl(src: string, siteUrl: string): string | null {
  if (src.startsWith('data:')) return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('//')) return `https:${src}`;
  if (src.startsWith('/')) return `${siteUrl}${src}`;
  return null;
}

// Image sitemap for blog posts: the featured image plus every image in the
// body. (image:title/caption are deprecated by Google, so only image:loc.)
export async function GET() {
  const db = createServiceClient();
  const siteUrl = await getSiteUrl();
  const structure = await getPostUrlStructure();

  const { data: posts } = await db
    .from('posts')
    .select('slug, featured_image_url, content, updated_at, canonical_url, categories(slug)')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(1000);

  const urlEntries: string[] = [];

  (posts || []).forEach((post: any) => {
    // Posts canonicalised to another site are not ours to list.
    if (post.canonical_url && !post.canonical_url.replace(/\/+$/, '').startsWith(siteUrl)) return;
    const categorySlug = (post.categories as { slug: string } | null)?.slug;
    const images = new Set<string>();

    const featured = post.featured_image_url ? absoluteImageUrl(post.featured_image_url, siteUrl) : null;
    if (featured) images.add(featured);

    if (post.content) {
      const imgRegex = /<img\b[^>]*?\bsrc=["']([^"']+)["']/gi;
      let match;
      while ((match = imgRegex.exec(post.content)) !== null) {
        const src = absoluteImageUrl(match[1], siteUrl);
        if (src) images.add(src);
      }
    }

    if (images.size > 0) {
      urlEntries.push(
        `  <url>
    <loc>${siteUrl}${postPath(post.slug, categorySlug, structure)}</loc>
    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>
${Array.from(images).map((src) => `    <image:image>\n      <image:loc>${escapeXml(src)}</image:loc>\n    </image:image>`).join('\n')}
  </url>`
      );
    }
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
