import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Like } from './exec';

// The site runs on Cloudflare Workers: Postgres-style data lives in D1 (binding DB) and uploads in R2 (binding BUCKET).
// Both are declared in wrangler.jsonc. Server-only.

// Shape the storage code expects from an object bucket (the subset of an R2 bucket binding it uses).
export interface R2Like {
  put(key: string, value: ArrayBuffer | ArrayBufferView | ReadableStream | string | Blob, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<null | {
    body: ReadableStream;
    httpEtag: string;
    size: number;
    httpMetadata?: { contentType?: string };
  }>;
  head(key: string): Promise<null | unknown>;
  delete(keys: string | string[]): Promise<void>;
  list(opts?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    objects: { key: string; size: number; uploaded: Date }[];
    truncated: boolean;
    cursor?: string;
  }>;
}

export interface DbEnv {
  DB: D1Like;
  BUCKET: R2Like;
}

export function dbEnv(): DbEnv {
  // Throws during `next build` (no bindings there); the pages that read the database are rendered per request.
  const { env } = getCloudflareContext();
  return { DB: env.DB as unknown as D1Like, BUCKET: env.BUCKET as unknown as R2Like };
}
