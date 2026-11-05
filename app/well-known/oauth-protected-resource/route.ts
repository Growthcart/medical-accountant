import { corsJson, handleOptions } from '@/lib/mcp/http';
import { ISSUER, MCP_SCOPE, RESOURCE_URL } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';

// RFC 9728 Protected Resource Metadata, served at
// /.well-known/oauth-protected-resource (rewritten here in next.config.mjs).
// The MCP client reads this, pointed to by the 401 WWW-Authenticate
// challenge, to find the authorization server protecting /api/mcp.
export function GET() {
  return corsJson({
    resource: RESOURCE_URL(),
    authorization_servers: [ISSUER()],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ['header'],
    resource_name: 'MedicalAccountant.ie blog publishing',
  });
}

export function OPTIONS() {
  return handleOptions();
}
