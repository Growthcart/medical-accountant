import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AuthorArchive, authorArchiveMetadata, parsePage } from '@/components/blog/archives';

// Read from the database on every request (no ISR cache is configured).
export const dynamic = 'force-dynamic';

// Later pages of an author archive (/blog/author/vijay/page/2).

interface PageProps {
  params: Promise<{ username: string; page: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, page: raw } = await params;
  const page = parsePage(raw);
  return page ? authorArchiveMetadata(username, page) : { title: 'Not Found' };
}

export default async function AuthorPagedPage({ params }: PageProps) {
  const { username, page: raw } = await params;
  const page = parsePage(raw);
  if (!page) notFound();
  return <AuthorArchive segment={username} page={page} fromPagedRoute />;
}
