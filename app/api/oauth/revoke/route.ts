import { NextRequest, NextResponse } from 'next/server';
import { CORS_HEADERS, handleOptions } from '@/lib/mcp/http';
import { revokeToken } from '@/lib/mcp/oauth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// RFC 7009 token revocation. MCP clients call this when a connection is
// removed; the response is 200 whether or not the token was known.
export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit(`oauth-revoke:${getClientIp(request.headers)}`, 60, 60);
  if (!allowed) return new NextResponse(null, { status: 429, headers: CORS_HEADERS });
  const form = await request.formData().catch(() => null);
  const token = form ? String(form.get('token') || '') : '';
  const clientId = form ? String(form.get('client_id') || '') : '';
  if (token) await revokeToken(token, clientId || null);
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return handleOptions();
}
