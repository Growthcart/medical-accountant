import { QueryBuilder } from './builder';
import { publicUrlFor } from '@/lib/storage/public-url';

// Browser-side database client. Queries are sent to /api/db, which applies
// the access rules in lib/db/authz.ts. Auth and storage calls go to
// /api/auth/* and /api/storage. The session itself is an HttpOnly cookie, so
// getSession() only reports whether one exists.

function postJson(url: string, body: unknown) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function createClient() {
  return {
    from: (table: string) =>
      new QueryBuilder(async (desc) => {
        try {
          const res = await postJson('/api/db', desc);
          const json = await res.json();
          return res.ok ? json : { data: null, error: json.error ?? { message: `Request failed (${res.status})` } };
        } catch (e) {
          return { data: null, error: { message: e instanceof Error ? e.message : 'Network error' } };
        }
      }, table),

    auth: {
      async getSession() {
        const res = await fetch('/api/auth/session').catch(() => null);
        const body = res?.ok ? await res.json() : null;
        // access_token is a placeholder: the server authenticates from the cookie.
        return { data: { session: body?.user ? { user: body.user, access_token: 'cookie' } : null } };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const res = await postJson('/api/auth/login', { email, password });
        const body = await res.json().catch(() => ({}));
        return res.ok ? { error: null } : { error: { message: body.error || 'Sign in failed' } };
      },
      async signOut() {
        await postJson('/api/auth/logout', {});
      },
    },

    storage: {
      from: (bucket: string) => ({
        async upload(path: string, file: Blob, opts?: { contentType?: string; upsert?: boolean }) {
          const form = new FormData();
          form.set('bucket', bucket);
          form.set('path', path);
          form.set('upsert', opts?.upsert ? '1' : '');
          form.set('file', file);
          const res = await fetch('/api/storage', { method: 'POST', body: form });
          const body = await res.json().catch(() => ({}));
          return { error: res.ok ? null : { message: body.error || 'Upload failed' } };
        },
        async remove(paths: string[]) {
          const res = await fetch('/api/storage', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bucket, paths }),
          });
          const body = await res.json().catch(() => ({}));
          return { error: res.ok ? null : { message: body.error || 'Delete failed' } };
        },
        async list(prefix = '', opts?: { limit?: number; offset?: number }) {
          const q = new URLSearchParams({ bucket, prefix, limit: String(opts?.limit ?? 100), offset: String(opts?.offset ?? 0) });
          const res = await fetch(`/api/storage?${q}`);
          const body = await res.json().catch(() => ({}));
          return res.ok
            ? { data: body.data as { id: string; name: string; created_at: string; metadata: { size: number } }[], error: null }
            : { data: null, error: { message: body.error || 'List failed' } };
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: publicUrlFor(bucket, path) } }),
      }),
    },
  };
}
