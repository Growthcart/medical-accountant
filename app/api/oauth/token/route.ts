import { NextRequest } from 'next/server';
import { corsJson, handleOptions } from '@/lib/mcp/http';
import { consumeAuthCode, getClient, issueTokens, MCP_SCOPE, rotateRefreshToken, sha256, verifyPkceS256 } from '@/lib/mcp/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenError(error: string, description?: string, status = 400) {
  return corsJson({ error, ...(description ? { error_description: description } : {}) }, { status });
}

// OAuth token endpoint: authorization_code (with PKCE) and refresh_token grants.
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) return tokenError('invalid_request', 'Expected application/x-www-form-urlencoded body');

  const grantType = String(form.get('grant_type') || '');
  const clientId = String(form.get('client_id') || '');
  const clientSecret = form.get('client_secret') ? String(form.get('client_secret')) : null;

  if (!clientId) return tokenError('invalid_client', 'client_id is required');
  const client = await getClient(clientId);
  if (!client) return tokenError('invalid_client', 'Unknown client', 401);

  // Confidential clients must present their secret.
  if (client.token_endpoint_auth_method !== 'none') {
    if (!clientSecret || !client.client_secret_hash || sha256(clientSecret) !== client.client_secret_hash) {
      return tokenError('invalid_client', 'Bad client credentials', 401);
    }
  }

  if (grantType === 'authorization_code') {
    const code = String(form.get('code') || '');
    const redirectUri = String(form.get('redirect_uri') || '');
    const codeVerifier = String(form.get('code_verifier') || '');
    if (!code || !redirectUri || !codeVerifier) {
      return tokenError('invalid_request', 'code, redirect_uri and code_verifier are required');
    }

    const consumed = await consumeAuthCode(code);
    if (!consumed) return tokenError('invalid_grant', 'Authorization code is invalid or expired');
    if (consumed.client_id !== clientId) return tokenError('invalid_grant', 'Code was issued to a different client');
    if (consumed.redirect_uri !== redirectUri) return tokenError('invalid_grant', 'redirect_uri mismatch');
    if (!verifyPkceS256(codeVerifier, consumed.code_challenge)) return tokenError('invalid_grant', 'PKCE verification failed');

    const tokens = await issueTokens({ clientId, userId: consumed.user_id, scope: consumed.scope || MCP_SCOPE });
    return corsJson({
      access_token: tokens.access_token,
      token_type: 'Bearer',
      expires_in: tokens.expires_in,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
    });
  }

  if (grantType === 'refresh_token') {
    const refreshToken = String(form.get('refresh_token') || '');
    if (!refreshToken) return tokenError('invalid_request', 'refresh_token is required');
    const rotated = await rotateRefreshToken(refreshToken, clientId);
    if (!rotated) return tokenError('invalid_grant', 'Refresh token is invalid or expired');
    return corsJson({
      access_token: rotated.access_token,
      token_type: 'Bearer',
      expires_in: rotated.expires_in,
      refresh_token: rotated.refresh_token,
      scope: rotated.scope,
    });
  }

  return tokenError('unsupported_grant_type', `Unsupported grant_type: ${grantType}`);
}

export function OPTIONS() {
  return handleOptions();
}
