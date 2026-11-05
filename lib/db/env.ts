import { Pool } from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { D1Like } from './exec';

// Supabase backs the site: Postgres for data (queried over the connection pooler) and Supabase Storage for uploads.
// Server-only. Environment variables:
//   DATABASE_URL                 Supabase "Transaction pooler" connection string (port 6543)
//   SUPABASE_URL                 https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    service-role key (never expose to the browser)
//   SUPABASE_STORAGE_BUCKET      optional, defaults to "uploads" (a PRIVATE bucket; files are served by /files/*)

// Shape the storage code expects from an object bucket (kept from the R2 version so callers are unchanged).
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

const g = globalThis as { __pgPool?: Pool; __sb?: SupabaseClient };

function pool(): Pool {
  if (!g.__pgPool) {
    // DATABASE_URL, or POSTGRES_URL as added by Vercel's Supabase integration. The query string (sslmode=require...) is
    // dropped: it would override the ssl option below with strict certificate checking.
    const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!raw) throw new Error('DATABASE_URL is not set (Supabase transaction pooler connection string)');
    const connectionString = raw.replace(/\?.*$/, '');
    g.__pgPool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      // shortcut: the connection is encrypted but the Supabase pooler certificate is not verified, add Supabase's CA via the `ca` option to verify it.
      ssl: { rejectUnauthorized: false },
    });
  }
  return g.__pgPool;
}

// The query layer writes "?" placeholders; Postgres wants $1, $2, ...
const DB: D1Like = {
  prepare: (sql) => ({
    bind: (...values) => ({
      async all() {
        let n = 0;
        const res = await pool().query(sql.replace(/\?/g, () => `$${++n}`), values as unknown[]);
        return { results: res.rows };
      },
    }),
  }),
};

function bucket() {
  if (!g.__sb) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    g.__sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return g.__sb.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'uploads');
}

const BUCKET: R2Like = {
  async put(key, value, opts) {
    const { error } = await bucket().upload(key, value as Blob | ArrayBuffer, { contentType: opts?.httpMetadata?.contentType, upsert: true });
    if (error) throw new Error(error.message);
  },
  async get(key) {
    const { data, error } = await bucket().download(key);
    if (error || !data) return null;
    // Object names carry a timestamp or random suffix, so size is enough for a weak ETag.
    return { body: data.stream(), httpEtag: `W/"${data.size}"`, size: data.size, httpMetadata: { contentType: data.type || undefined } };
  },
  async head(key) {
    const { data } = await bucket().exists(key);
    return data ? {} : null;
  },
  async delete(keys) {
    const { error } = await bucket().remove(Array.isArray(keys) ? keys : [keys]);
    if (error) throw new Error(error.message);
  },
  async list(opts) {
    const prefix = opts?.prefix ?? '';
    const slash = prefix.lastIndexOf('/');
    const folder = slash >= 0 ? prefix.slice(0, slash) : '';
    const search = slash >= 0 ? prefix.slice(slash + 1) : prefix;
    const { data, error } = await bucket().list(folder, { limit: opts?.limit ?? 1000, search: search || undefined });
    if (error) throw new Error(error.message);
    const objects = (data ?? [])
      .filter((o) => o.id) // folders have no id
      .map((o) => ({ key: folder ? `${folder}/${o.name}` : o.name, size: Number(o.metadata?.size ?? 0), uploaded: new Date(o.created_at ?? Date.now()) }));
    return { objects, truncated: false };
  },
};

export function dbEnv(): DbEnv {
  return { DB, BUCKET };
}
