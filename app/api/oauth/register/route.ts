import { NextRequest } from 'next/server';
import { corsJson, handleOptions } from '@/lib/mcp/http';
import { registerClient } from '@/lib/mcp/oauth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_REDIRECT_URI_LENGTH = 2048;
const ALLOWED_GRANT_TYPES = ['authorization_code', 'refresh_token'];
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

// https anywhere, or plain http on a loopback host (native/CLI clients). Any
// other scheme (javascript:, data:, custom app schemes) is refused, as are
// fragments, which OAuth forbids in redirect URIs.
function isAllowedRedirectUri(uri: string): boolean {
  if (uri.length > MAX_REDIRECT_URI_LENGTH) return false;
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    return u.protocol === 'https:' || (u.protocol === 'http:' && LOOPBACK_HOSTS.includes(u.hostname));
  } catch {
    return false;
  }
}

// RFC 7591 Dynamic Client Registration. The MCP client (claude.ai) posts its
// metadata and gets back a client_id for the authorization-code flow. It is
// unauthenticated by design (the MCP spec requires it), so it is
// rate-limited per IP to stop a bot bloating the clients table.
export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit(`oauth-register:${getClientIp(request.headers)}`, 20, 60 * 60);
  if (!allowed) {
    return corsJson({ error: 'rate_limited', error_description: 'Too many registrations; try again later' }, { status: 429 });
  }

  // Client metadata is a few hundred bytes; cap it so the endpoint can't be
  // used to fill the clients table.
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return corsJson({ error: 'invalid_client_metadata', error_description: 'Registration body too large' }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return corsJson({ error: 'invalid_client_metadata', error_description: 'Body must be JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return corsJson({ error: 'invalid_client_metadata', error_description: 'Body must be a JSON object' }, { status: 400 });
  }

  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || redirectUris.length > 10 || !redirectUris.every((u) => typeof u === 'string')) {
    return corsJson({ error: 'invalid_redirect_uri', error_description: 'redirect_uris (array of https URLs) is required' }, { status: 400 });
  }
  for (const uri of redirectUris as string[]) {
    if (!isAllowedRedirectUri(uri)) {
      return corsJson({ error: 'invalid_redirect_uri', error_description: 'redirect_uri must be an https URL (or http on localhost) without a fragment' }, { status: 400 });
    }
  }

  const grantTypes = Array.isArray(body.grant_types)
    ? (body.grant_types as unknown[]).filter((g): g is string => typeof g === 'string' && ALLOWED_GRANT_TYPES.includes(g))
    : undefined;

  try {
    const { client, client_secret } = await registerClient({
      client_name: typeof body.client_name === 'string' ? body.client_name : undefined,
      redirect_uris: redirectUris as string[],
      grant_types: grantTypes,
      token_endpoint_auth_method: typeof body.token_endpoint_auth_method === 'string' ? body.token_endpoint_auth_method : 'none',
    });

    return corsJson(
      {
        client_id: client.client_id,
        ...(client_secret ? { client_secret } : {}),
        client_name: client.client_name,
        redirect_uris: client.redirect_uris,
        grant_types: client.grant_types,
        token_endpoint_auth_method: client.token_endpoint_auth_method,
        scope: client.scope,
        client_id_issued_at: Math.floor(Date.now() / 1000),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[oauth/register] error:', error);
    return corsJson({ error: 'server_error', error_description: 'Registration failed' }, { status: 500 });
  }
}

export function OPTIONS() {
  return handleOptions();
}
