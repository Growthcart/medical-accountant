import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryArchive, categoryArchiveMetadata, parsePage } from '@/components/blog/archives';

// Read from the database on every request (no ISR cache is configured).
export const dynamic = 'force-dynamic';

// Later pages of a category archive (/blog/category/seo/page/2).

interface PageProps {
  params: Promise<{ slug: string; page: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, page: raw } = await params;
  const page = parsePage(raw);
  return page ? categoryArchiveMetadata(slug, page) : { title: 'Not Found' };
}

export default async function CategoryPagedPage({ params }: PageProps) {
  const { slug, page: raw } = await params;
  const page = parsePage(raw);
  if (!page) notFound();
  return <CategoryArchive slug={slug} page={page} fromPagedRoute />;
}
