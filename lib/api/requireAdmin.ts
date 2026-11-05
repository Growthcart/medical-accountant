import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, type DbClient } from '@/lib/db/server';
import { getSessionUser, type SessionUser } from '@/lib/auth/session';

export interface AdminContext {
  db: DbClient;
  user: SessionUser;
}

// Shared admin gate for API route handlers: the request must carry a valid
// session (cookie, or Bearer session token) whose profile role is 'admin'.
//
// Returns either an { db, user } context or a NextResponse error.
// Callers should do: `if (gate instanceof NextResponse) return gate;`
export async function requireAdmin(
  request: NextRequest,
): Promise<AdminContext | NextResponse> {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const db = createServiceClient();
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { db, user };
}
