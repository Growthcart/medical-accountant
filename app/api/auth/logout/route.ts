import { NextRequest, NextResponse } from 'next/server';
import { destroySession, SESSION_COOKIE, sessionCookieOptions, tokenFromRequest } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = await tokenFromRequest(request);
  if (token) await destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return res;
}
