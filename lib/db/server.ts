import { QueryBuilder } from './builder';
import { runQuery } from './exec';
import { dbEnv } from './env';
import { createServerStorage } from '@/lib/storage/r2';
import { getSessionUser } from '@/lib/auth/session';

// Server-side database client (Server Components, route handlers, middleware).
// It talks to Postgres (Supabase) directly and is NOT subject to any row-level rules: callers
// are trusted and must check authorisation themselves (lib/api/requireAdmin).
// Browser code uses lib/db/client.ts, which goes through /api/db instead.

export function createServiceClient() {
  const { DB } = dbEnv();
  return {
    from: (table: string) => new QueryBuilder((desc) => runQuery(DB, desc), table),
    storage: createServerStorage(),
    // Session lookup from the request cookie / Bearer token.
    auth: {
      async getUser() {
        const user = await getSessionUser();
        return { data: { user }, error: null };
      },
    },
  };
}

// Alias: there is no per-visitor client any more, since access control lives in
// the callers (server) and lib/db/authz.ts (browser).
export const createClient = createServiceClient;
export type DbClient = ReturnType<typeof createServiceClient>;
