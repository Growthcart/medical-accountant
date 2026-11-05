import Hero from '@/components/Hero';
import { Testimonial, Team, ContactPanel, ServiceBody } from '@/components/Sections';
import PostPage, { postMetadata } from '@/components/blog/PostPage';
import JsonLd from '@/components/JsonLd';
import { content, pageMeta } from '@/lib/site';

// The site's own pages (gp-accountants, ihca, ...) are built ahead of time. Any other /{slug}/ is a news post
// read from the CMS on request, so a post published in the admin works without a rebuild.
// Posts come from the database and PostPage calls connection(), which cannot run in a prerendered/ISR route
// (Vercel: DYNAMIC_SERVER_USAGE), so the whole /{slug}/ route is rendered per request.
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

const pages = Object.entries(content.pages).filter(([, p]) => p.blocks);

export function generateStaticParams() {
  return pages.map(([slug]) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (content.pages[slug]?.blocks) return pageMeta(slug, `/${slug}/`);
  return postMetadata(slug);
}

export default async function Page({ params }) {
  const { slug } = await params;
  const page = content.pages[slug];
  if (!page?.blocks) return <PostPage slug={slug} />;
  return (
    <main id="main">
      <JsonLd path={`/${slug}/`} name={page.h1} description={page.description} kind="service" />
      <Hero hero={slug} title={page.h1} lead={page.lead} />
      <ServiceBody page={page} />
      <Testimonial />
      <Team />
      <ContactPanel />
    </main>
  );
}
