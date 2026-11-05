import { Metadata } from 'next';
import { BlogArchive, blogArchiveMetadata } from '@/components/blog/archives';

// Read from the database on every request (no ISR cache is configured).
export const dynamic = 'force-dynamic';


export async function generateMetadata(): Promise<Metadata> {
  return blogArchiveMetadata(1);
}

export default function BlogPage() {
  return <BlogArchive page={1} />;
}
