import { createHash, randomBytes } from 'node:crypto';
import type { DbClient } from '@/lib/db/server';
import { createServiceClient } from '@/lib/db/server';

// OAuth 2.1 authorization-server helpers for the remote MCP endpoint
// (/api/mcp). Persistence is in the mcp_oauth_* tables (database/d1-schema.sql),
// which are server-only and never reachable through /api/db.

export const MCP_SCOPE = 'publish';
export const AUTH_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Roles allowed to publish through MCP. MedicalAccountant.ie profiles are admins.
export const PUBLISH_ROLES = ['admin'] as const;

export function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

// The site does not use trailing slashes, so endpoints are advertised
// without one (a slash form would 308-redirect, which clients must not hit on
// POST).
export const ISSUER = () => baseUrl();
export const RESOURCE_URL = () => `${baseUrl()}/api/mcp`;
export const AUTHORIZATION_ENDPOINT = () => `${baseUrl()}/api/oauth/authorize`;
export const TOKEN_ENDPOINT = () => `${baseUrl()}/api/oauth/token`;
export const REGISTRATION_ENDPOINT = () => `${baseUrl()}/api/oauth/register`;
export const REVOCATION_ENDPOINT = () => `${baseUrl()}/api/oauth/revoke`;
export const PROTECTED_RESOURCE_METADATA_URL = () => `${baseUrl()}/.well-known/oauth-protected-resource`;

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function verifyPkceS256(verifier: string, challenge: string): boolean {
  return createHash('sha256').update(verifier).digest('base64url') === challenge;
}

export function isPublisher(role: string | null | undefined): boolean {
  return (PUBLISH_ROLES as readonly string[]).includes(role || '');
}

// ---- clients (RFC 7591 dynamic client registration) ----

export interface OAuthClient {
  client_id: string;
  client_secret_hash: string | null;
  client_name: string | null;
  redirect_uris: string[];
  grant_types: string[];
  token_endpoint_auth_method: string;
  scope: string | null;
}

export async function registerClient(input: {
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
  metadata?: unknown;
}): Promise<{ client: OAuthClient; client_secret?: string }> {
  const client_id = `mcp_${randomToken(16)}`;
  const method = input.token_endpoint_auth_method === 'client_secret_post' ? 'client_secret_post' : 'none';

  let client_secret: string | undefined;
  let client_secret_hash: string | null = null;
  if (method !== 'none') {
    client_secret = randomToken(32);
    client_secret_hash = sha256(client_secret);
  }

  const row = {
    client_id,
    client_secret_hash,
    client_name: input.client_name?.slice(0, 200) || null,
    redirect_uris: input.redirect_uris,
    grant_types: input.grant_types && input.grant_types.length ? input.grant_types : ['authorization_code', 'refresh_token'],
    token_endpoint_auth_method: method,
    scope: MCP_SCOPE,
    metadata: input.metadata ?? null,
  };

  const { error } = await createServiceClient().from('mcp_oauth_clients').insert(row);
  if (error) throw new Error(`Failed to register client: ${error.message}`);

  return {
    client: {
      client_id,
      client_secret_hash,
      client_name: row.client_name,
      redirect_uris: row.redirect_uris,
      grant_types: row.grant_types,
      token_endpoint_auth_method: method,
      scope: row.scope,
    },
    client_secret,
  };
}

export async function getClient(clientId: string): Promise<OAuthClient | null> {
  const { data } = await createServiceClient()
    .from('mcp_oauth_clients')
    .select('client_id, client_secret_hash, client_name, redirect_uris, grant_types, token_endpoint_auth_method, scope')
    .eq('client_id', clientId)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    redirect_uris: Array.isArray(data.redirect_uris) ? data.redirect_uris : [],
    grant_types: Array.isArray(data.grant_types) ? data.grant_types : [],
  } as OAuthClient;
}

// ---- authorization codes ----

export async function issueAuthCode(input: {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
}): Promise<string> {
  const code = randomToken(32);
  const { error } = await createServiceClient().from('mcp_oauth_auth_codes').insert({
    code_hash: sha256(code),
    client_id: input.clientId,
    user_id: input.userId,
    redirect_uri: input.redirectUri,
    code_challenge: input.codeChallenge,
    code_challenge_method: input.codeChallengeMethod,
    scope: input.scope,
    expires_at: new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString(),
  });
  if (error) throw new Error(`Failed to issue auth code: ${error.message}`);
  return code;
}

export interface ConsumedCode {
  client_id: string;
  user_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string | null;
}

// Consume a code (single use). Returns the row, or null if it is invalid,
// already used or expired.
export async function consumeAuthCode(code: string): Promise<ConsumedCode | null> {
  const db = createServiceClient();
  const codeHash = sha256(code);
  const { data } = await db
    .from('mcp_oauth_auth_codes')
    .select('client_id, user_id, redirect_uri, code_challenge, code_challenge_method, scope, expires_at, consumed')
    .eq('code_hash', codeHash)
    .maybeSingle();

  if (!data || data.consumed) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  // Conditional update: only one concurrent exchange can flip consumed.
  const { data: updated } = await db
    .from('mcp_oauth_auth_codes')
    .update({ consumed: true })
    .eq('code_hash', codeHash)
    .eq('consumed', false)
    .select('client_id')
    .maybeSingle();
  if (!updated) return null;

  return {
    client_id: data.client_id,
    user_id: data.user_id,
    redirect_uri: data.redirect_uri,
    code_challenge: data.code_challenge,
    code_challenge_method: data.code_challenge_method,
    scope: data.scope,
  };
}

// ---- tokens ----

export interface IssuedTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

export async function issueTokens(input: { clientId: string; userId: string; scope: string }): Promise<IssuedTokens> {
  const access = randomToken(32);
  const refresh = randomToken(32);
  const now = Date.now();
  const { error } = await createServiceClient().from('mcp_oauth_tokens').insert({
    access_token_hash: sha256(access),
    refresh_token_hash: sha256(refresh),
    client_id: input.clientId,
    user_id: input.userId,
    scope: input.scope,
    access_expires_at: new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
    refresh_expires_at: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
  });
  if (error) throw new Error(`Failed to issue tokens: ${error.message}`);
  return {
    access_token: access,
    refresh_token: refresh,
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    scope: input.scope,
  };
}

// Refresh-token rotation: the presented refresh token is revoked and a fresh
// access/refresh pair is issued.
export async function rotateRefreshToken(refreshToken: string, clientId: string): Promise<IssuedTokens | null> {
  const db = createServiceClient();
  const { data } = await db
    .from('mcp_oauth_tokens')
    .select('id, client_id, user_id, scope, refresh_expires_at, revoked')
    .eq('refresh_token_hash', sha256(refreshToken))
    .maybeSingle();

  if (!data || data.revoked || data.client_id !== clientId) return null;
  if (!data.refresh_expires_at || new Date(data.refresh_expires_at).getTime() < Date.now()) return null;

  const { data: revoked } = await db
    .from('mcp_oauth_tokens')
    .update({ revoked: true })
    .eq('id', data.id)
    .eq('revoked', false)
    .select('id')
    .maybeSingle();
  if (!revoked) return null;

  return issueTokens({ clientId, userId: data.user_id, scope: data.scope || MCP_SCOPE });
}

export interface TokenContext {
  userId: string;
  role: string;
  scope: string | null;
}

// Validate a presented bearer token. Returns the publishing context or null.
export async function validateAccessToken(accessToken: string): Promise<TokenContext | null> {
  const db = createServiceClient();
  const { data } = await db
    .from('mcp_oauth_tokens')
    .select('id, user_id, scope, access_expires_at, revoked')
    .eq('access_token_hash', sha256(accessToken))
    .maybeSingle();

  if (!data || data.revoked) return null;
  if (new Date(data.access_expires_at).getTime() < Date.now()) return null;

  const { data: profile } = await db.from('profiles').select('role').eq('id', data.user_id).maybeSingle();

  // Best-effort last-used stamp.
  await db.from('mcp_oauth_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);

  return { userId: data.user_id, role: (profile?.role as string) || 'user', scope: data.scope };
}

// RFC 7009: revoke the token row matching an access or refresh token.
// Unknown tokens are ignored, as the RFC requires.
export async function revokeToken(token: string, clientId?: string | null): Promise<void> {
  const db = createServiceClient();
  const hash = sha256(token);
  for (const column of ['access_token_hash', 'refresh_token_hash'] as const) {
    let query = db.from('mcp_oauth_tokens').update({ revoked: true }).eq(column, hash);
    if (clientId) query = query.eq('client_id', clientId);
    await query;
  }
}
