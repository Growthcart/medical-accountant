import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TagArchive, parsePage, tagArchiveMetadata } from '@/components/blog/archives';

// Read from the database on every request (no ISR cache is configured).
export const dynamic = 'force-dynamic';

// Later pages of a tag archive (/blog/tag/ai/page/2).

interface PageProps {
  params: Promise<{ slug: string; page: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, page: raw } = await params;
  const page = parsePage(raw);
  return page ? tagArchiveMetadata(slug, page) : { title: 'Not Found' };
}

export default async function TagPagedPage({ params }: PageProps) {
  const { slug, page: raw } = await params;
  const page = parsePage(raw);
  if (!page) notFound();
  return <TagArchive slug={slug} page={page} fromPagedRoute />;
}
