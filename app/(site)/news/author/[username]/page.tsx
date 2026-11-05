import { Metadata } from 'next';
import { AuthorArchive, authorArchiveMetadata } from '@/components/blog/archives';
import { getAuthorSegmentsWithPosts } from '@/lib/blog/listing';

// Read from the database on every request (no ISR cache is configured).
export const dynamic = 'force-dynamic';

// Author archive: profile card plus every post by the author. The segment is
// the profile's username, or a slug of the author's name when it has none.

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return authorArchiveMetadata(username, 1);
}

export default async function AuthorPage({ params }: PageProps) {
  const { username } = await params;
  return <AuthorArchive segment={username} page={1} />;
}
