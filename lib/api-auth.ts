import type { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSessionUser } from '@/lib/auth/session';
import { safeEqual } from '@/lib/auth/tokens';

export type ApiAuthResult =
  | { ok: true; via: 'api_key' }
  | { ok: true; via: 'session'; userId: string }
  | { ok: false; status: number; error: string };

function bearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : null;
}

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await createServiceClient().from('profiles').select('role').eq('id', userId).maybeSingle();
  return data?.role === 'admin';
}

// Accepts either the server-to-server API key (POSTS_API_KEY, used by the
// Claude Code MCP server and other integrations) sent as `x-api-key` or a
// Bearer token, or a signed-in admin (session cookie or Bearer session token).
export async function authorizeApiRequest(request: NextRequest): Promise<ApiAuthResult> {
  const expectedKey = process.env.POSTS_API_KEY;
  const presented = request.headers.get('x-api-key') || bearerToken(request);

  if (presented && expectedKey && safeEqual(presented, expectedKey)) {
    return { ok: true, via: 'api_key' };
  }

  try {
    const user = await getSessionUser(request);
    if (!user) return { ok: false, status: 401, error: 'Unauthorized' };
    if (!(await isAdmin(user.id))) return { ok: false, status: 403, error: 'Forbidden' };
    return { ok: true, via: 'session', userId: user.id };
  } catch {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
}
