import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { runQuery } from '@/lib/db/exec';
import { dbEnv } from '@/lib/db/env';
import { sha256Hex, randomToken } from '@/lib/auth/tokens';

// Opaque random session tokens, stored hashed in the database and sent as an HttpOnly
// cookie. API clients may also send the token as a Bearer header.

export const SESSION_COOKIE = 'cms_session';
const SESSION_DAYS = 7;

export interface SessionUser {
  id: string;
  email: string;
}

export const sessionCookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: maxAgeSeconds,
});

export async function createSession(userId: string): Promise<{ token: string; maxAge: number }> {
  const token = randomToken();
  const maxAge = SESSION_DAYS * 86400;
  const { error } = await runQuery(dbEnv().DB, {
    table: 'sessions', op: 'insert', filters: [], orders: [],
    values: { token_hash: await sha256Hex(token), user_id: userId, expires_at: new Date(Date.now() + maxAge * 1000).toISOString() },
  });
  if (error) throw new Error(error.message);
  return { token, maxAge };
}

export async function destroySession(token: string): Promise<void> {
  await runQuery(dbEnv().DB, {
    table: 'sessions', op: 'delete', orders: [],
    filters: [{ col: 'token_hash', op: 'eq', val: await sha256Hex(token) }],
  });
}

async function userForToken(token: string): Promise<SessionUser | null> {
  const db = dbEnv().DB;
  const { data: session } = await runQuery(db, {
    table: 'sessions', op: 'select', orders: [], single: 'maybe', select: 'user_id, expires_at',
    filters: [{ col: 'token_hash', op: 'eq', val: await sha256Hex(token) }],
  });
  if (!session || session.expires_at < new Date().toISOString()) return null;
  const { data: user } = await runQuery(db, {
    table: 'users', op: 'select', orders: [], single: 'maybe', select: 'id, email',
    filters: [{ col: 'id', op: 'eq', val: session.user_id }],
  });
  return user ?? null;
}

/** The token on a request: session cookie first, then `Authorization: Bearer`. */
export async function tokenFromRequest(request?: NextRequest): Promise<string | null> {
  const cookie = request ? request.cookies.get(SESSION_COOKIE)?.value : (await cookies()).get(SESSION_COOKIE)?.value;
  if (cookie) return cookie;
  const auth = request?.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
}

/** The signed-in user for this request, or null. Pass the request in route handlers. */
export async function getSessionUser(request?: NextRequest): Promise<SessionUser | null> {
  const token = await tokenFromRequest(request);
  return token ? userForToken(token) : null;
}
