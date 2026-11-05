import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogArchive, blogArchiveMetadata, parsePage } from '@/components/blog/archives';

// Read from the database on every request (no ISR cache is configured).
export const dynamic = 'force-dynamic';

// Later pages of the blog index (/blog/page/2). Rendered on first request
// and cached like the first page.

interface PageProps {
  params: Promise<{ page: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = parsePage((await params).page);
  return page ? blogArchiveMetadata(page) : { title: 'Not Found' };
}

export default async function BlogPagedPage({ params }: PageProps) {
  const page = parsePage((await params).page);
  if (!page) notFound();
  return <BlogArchive page={page} fromPagedRoute />;
}
