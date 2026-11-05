import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runQuery } from '@/lib/db/exec';
import { dbEnv } from '@/lib/db/env';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ email: z.string().email(), password: z.string().min(1) });

// Same message for unknown email and wrong password.
const invalid = () => NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit(`login:${getClientIp(request.headers)}`, 10, 300);
  if (!allowed) return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });

  const { data: user } = await runQuery(dbEnv().DB, {
    table: 'users', op: 'select', orders: [], single: 'maybe', select: 'id, email, password_hash',
    filters: [{ col: 'email', op: 'eq', val: parsed.data.email.trim().toLowerCase() }],
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) return invalid();

  const { token, maxAge } = await createSession(user.id);
  const res = NextResponse.json({ user: { id: user.id, email: user.email } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(maxAge));
  return res;
}
