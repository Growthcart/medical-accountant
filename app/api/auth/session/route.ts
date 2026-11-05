import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json({ user: await getSessionUser(request) }, { headers: { 'Cache-Control': 'no-store' } });
}
