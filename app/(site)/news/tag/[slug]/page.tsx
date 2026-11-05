import { Metadata } from 'next';
import { TagArchive, tagArchiveMetadata } from '@/components/blog/archives';

// Read from the database on every request (no ISR cache is configured).
export const dynamic = 'force-dynamic';


interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return tagArchiveMetadata(slug, 1);
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;
  return <TagArchive slug={slug} page={1} />;
}
