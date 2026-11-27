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

// Cloudflare Email Sending binding (`send_email` in wrangler.jsonc).
type EmailAddress = string | { email: string; name: string };
export interface EmailLike {
  send(message: {
    from: EmailAddress;
    to: EmailAddress | EmailAddress[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: EmailAddress;
  }): Promise<{ messageId: string }>;
}

// Null when the binding isn't configured (or outside a Worker); email is then skipped.
export function emailBinding(): EmailLike | null {
  try {
    return (getCloudflareContext().env as unknown as { EMAIL?: EmailLike }).EMAIL ?? null;
  } catch {
    return null;
  }
}

// A wrangler var. Under `next dev` vars are only on the Worker env, not process.env,
// so read that first and fall back to process.env.
export function envVar(name: 'EMAIL_FROM' | 'ADMIN_NOTIFICATION_EMAIL'): string | undefined {
  try {
    const v = (getCloudflareContext().env as unknown as Record<string, unknown>)[name];
    if (typeof v === 'string' && v) return v;
  } catch {
    // no Cloudflare context (scripts, tests)
  }
  return process.env[name] || undefined;
}

export function dbEnv(): DbEnv {
  // Throws during `next build` (no bindings there); the pages that read the database are rendered per request.
  const { env } = getCloudflareContext();
  return { DB: env.DB as unknown as D1Like, BUCKET: env.BUCKET as unknown as R2Like };
}
