import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runQuery } from '@/lib/db/exec';
import { dbEnv } from '@/lib/db/env';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { safeEqual } from '@/lib/auth/tokens';
import { createSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ email: z.string().email(), password: z.string().min(1) });

// Same message for unknown email and wrong password.
// ADMIN_EMAIL / ADMIN_PASSWORD (Vercel environment variables) define the admin login. The matching database
// user is created on first sign-in and its password is re-synced on every sign-in, so changing the variable
// in Vercel (and redeploying) changes the password, and the old one stops working at once.
async function envAdmin(email: string, password: string): Promise<{ id: string; email: string } | 'wrong' | null> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || email !== adminEmail) return null;
  if (adminPassword.length < 8 || !safeEqual(password, adminPassword)) return 'wrong';

  const DB = dbEnv().DB;
  const hash = await hashPassword(adminPassword);
  const { data: existing } = await runQuery(DB, {
    table: 'users', op: 'select', orders: [], single: 'maybe', select: 'id',
    filters: [{ col: 'email', op: 'eq', val: adminEmail }],
  });
  if (existing) {
    await runQuery(DB, { table: 'users', op: 'update', orders: [], values: { password_hash: hash }, filters: [{ col: 'id', op: 'eq', val: existing.id }] });
    return { id: existing.id, email: adminEmail };
  }
  const id = crypto.randomUUID();
  const made = await runQuery(DB, { table: 'users', op: 'insert', filters: [], orders: [], values: { id, email: adminEmail, password_hash: hash } });
  if (made.error) throw new Error(made.error.message);
  await runQuery(DB, { table: 'profiles', op: 'upsert', filters: [], orders: [], values: { id, full_name: 'Admin', role: 'admin' } });
  return { id, email: adminEmail };
}

const invalid = () => NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit(`login:${getClientIp(request.headers)}`, 10, 300);
  if (!allowed) return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const fromEnv = await envAdmin(email, parsed.data.password);
  if (fromEnv === 'wrong') return invalid();
  if (fromEnv) {
    const { token, maxAge } = await createSession(fromEnv.id);
    const res = NextResponse.json({ user: fromEnv });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(maxAge));
    return res;
  }

  const { data: user } = await runQuery(dbEnv().DB, {
    table: 'users', op: 'select', orders: [], single: 'maybe', select: 'id, email, password_hash',
    filters: [{ col: 'email', op: 'eq', val: email }],
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) return invalid();

  const { token, maxAge } = await createSession(user.id);
  const res = NextResponse.json({ user: { id: user.id, email: user.email } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(maxAge));
  return res;
}
