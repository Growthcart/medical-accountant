import { corsJson, handleOptions } from '@/lib/mcp/http';
import { AUTHORIZATION_ENDPOINT, ISSUER, MCP_SCOPE, REGISTRATION_ENDPOINT, REVOCATION_ENDPOINT, TOKEN_ENDPOINT } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';

// RFC 8414 Authorization Server Metadata, served at
// /.well-known/oauth-authorization-server (rewritten here in next.config.mjs
// because Next.js does not route leading-dot folders). Advertises dynamic
// client registration, the authorization-code grant with PKCE S256, and
// refresh tokens.
export function GET() {
  return corsJson({
    issuer: ISSUER(),
    authorization_endpoint: AUTHORIZATION_ENDPOINT(),
    token_endpoint: TOKEN_ENDPOINT(),
    registration_endpoint: REGISTRATION_ENDPOINT(),
    revocation_endpoint: REVOCATION_ENDPOINT(),
    revocation_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    scopes_supported: [MCP_SCOPE],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    code_challenge_methods_supported: ['S256'],
  });
}

export function OPTIONS() {
  return handleOptions();
}
