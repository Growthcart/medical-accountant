import { dbEnv } from '@/lib/db/env';
import { publicUrlFor } from './public-url';

// Storage on Supabase Storage behind a small bucket API: from(bucket).upload / remove /
// list / getPublicUrl. Objects are keyed
// "<bucket>/<path>"; see public-url.ts for how they are served.

export const BUCKETS = ['post-images', 'form-uploads'] as const;

type Body = ArrayBuffer | ArrayBufferView | Blob | string;

export function createServerStorage() {
  return {
    from(bucket: string) {
      const key = (path: string) => `${bucket}/${path}`;
      return {
        async upload(path: string, body: Body, opts?: { contentType?: string; upsert?: boolean }) {
          try {
            const r2 = dbEnv().BUCKET;
            if (!opts?.upsert && (await r2.head(key(path)))) return { error: { message: 'The resource already exists' } };
            await r2.put(key(path), body, { httpMetadata: { contentType: opts?.contentType } });
            return { error: null };
          } catch (e) {
            return { error: { message: e instanceof Error ? e.message : 'Upload failed' } };
          }
        },
        async remove(paths: string[]) {
          try {
            if (paths.length) await dbEnv().BUCKET.delete(paths.map(key));
            return { error: null };
          } catch (e) {
            return { error: { message: e instanceof Error ? e.message : 'Delete failed' } };
          }
        },
        // shortcut: lists at most 1000 objects then sorts newest-first in memory, add a database index of uploads when a bucket outgrows that.
        async list(prefix = '', opts?: { limit?: number; offset?: number }) {
          try {
            const res = await dbEnv().BUCKET.list({ prefix: key(prefix), limit: 1000 });
            const data = res.objects
              .sort((x, y) => y.uploaded.getTime() - x.uploaded.getTime())
              .slice(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 1000))
              .map((o) => ({
                id: o.key,
                name: o.key.slice(bucket.length + 1),
                created_at: o.uploaded.toISOString(),
                metadata: { size: o.size },
              }));
            return { data, error: null };
          } catch (e) {
            return { data: null, error: { message: e instanceof Error ? e.message : 'List failed' } };
          }
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: publicUrlFor(bucket, path) } }),
      };
    },
  };
}
