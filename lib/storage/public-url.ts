import { SITE_URL } from '@/lib/seo';

// Public URL of a stored file. Objects are served by app/files/[...path]/route.ts,
// or from NEXT_PUBLIC_R2_PUBLIC_URL if the bucket is served from a custom domain.
export function publicUrlFor(bucket: string, path: string): string {
  const custom = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/+$/, '');
  return custom ? `${custom}/${bucket}/${path}` : `${SITE_URL}/files/${bucket}/${path}`;
}
