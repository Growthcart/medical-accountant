import { NextRequest, NextResponse } from 'next/server';
import type { QueryDesc } from '@/lib/db/builder';
import { authorize } from '@/lib/db/authz';
import { runQuery } from '@/lib/db/exec';
import { dbEnv } from '@/lib/db/env';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const OPS = new Set(['select', 'insert', 'update', 'delete', 'upsert']);

// Query endpoint for browser code (lib/db/client.ts). Everything is checked
// by lib/db/authz.ts before it reaches the database.
export async function POST(request: NextRequest) {
  let desc: QueryDesc;
  try {
    desc = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON' } }, { status: 400 });
  }
  if (!desc || typeof desc.table !== 'string' || !OPS.has(desc.op) || !Array.isArray(desc.filters) || !Array.isArray(desc.orders)) {
    return NextResponse.json({ error: { message: 'Invalid query' } }, { status: 400 });
  }

  const db = dbEnv().DB;
  const user = await getSessionUser(request);
  let isAdmin = false;
  if (user) {
    const { data } = await runQuery(db, {
      table: 'profiles', op: 'select', orders: [], single: 'maybe', select: 'role',
      filters: [{ col: 'id', op: 'eq', val: user.id }],
    });
    isAdmin = data?.role === 'admin';
  }

  const allowed = authorize(desc, isAdmin);
  if ('error' in allowed) return NextResponse.json({ error: { message: allowed.error } }, { status: allowed.status });
  return NextResponse.json(await runQuery(db, allowed));
}
