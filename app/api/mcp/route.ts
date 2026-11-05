import { NextRequest, NextResponse } from 'next/server';
import { CORS_HEADERS, corsJson, handleOptions } from '@/lib/mcp/http';
import { PROTECTED_RESOURCE_METADATA_URL, validateAccessToken, type TokenContext } from '@/lib/mcp/oauth';
import { MCP_TOOLS, callMcpTool } from '@/lib/mcp/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Remote MCP server (Streamable HTTP, stateless JSON-RPC) for publishing to
// the MedicalAccountant.ie blog from Claude.ai. Bearer tokens come from the OAuth flow
// under /api/oauth/*.

const SERVER_INFO = { name: 'cms-publisher', version: '1.0.0' };
const SUPPORTED_PROTOCOL = '2025-06-18';
const INSTRUCTIONS = [
  'Publishing tools for the medicalaccountant.ie blog. Flow: list_categories to pick a category slug,',
  'write the article in Markdown (no H1 in the body; the title is the H1), seo_preflight to check it,',
  'then create_post (status "draft" to review first, or publish directly). Posts are published under',
  'the connected account (whoami shows which); set author_username only when the user asks for a',
  'different author (names come from list_authors). For a featured image pass featured_image_source_url',
  '(or run upload_image) so it is stored on the site. Publishing refreshes the article, blog listings,',
  'sitemaps and feeds automatically.',
].join(' ');

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: unknown; protocolVersion?: string };
}

function jsonRpcResult(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}
function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

// 401 that tells the MCP client where to find the OAuth metadata (RFC 9728).
function unauthorized(): NextResponse {
  const res = NextResponse.json(
    { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } },
    { status: 401 },
  );
  res.headers.set('WWW-Authenticate', `Bearer resource_metadata="${PROTECTED_RESOURCE_METADATA_URL()}"`);
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

async function handleMessage(message: JsonRpcMessage, ctx: TokenContext) {
  const { id, method, params } = message || {};
  const isNotification = id === undefined || id === null;

  switch (method) {
    case 'initialize':
      return jsonRpcResult(id, {
        protocolVersion: typeof params?.protocolVersion === 'string' ? params.protocolVersion : SUPPORTED_PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null; // notifications get no response
    case 'ping':
      return jsonRpcResult(id, {});
    case 'tools/list':
      return jsonRpcResult(id, { tools: MCP_TOOLS });
    case 'tools/call': {
      if (!params?.name) return jsonRpcError(id, -32602, 'Missing tool name');
      return jsonRpcResult(id, await callMcpTool(params.name, params.arguments, ctx));
    }
    default:
      if (isNotification) return null;
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return unauthorized();
  const ctx = await validateAccessToken(token);
  if (!ctx) return unauthorized();

  let payload: JsonRpcMessage | JsonRpcMessage[];
  try {
    payload = await request.json();
  } catch {
    return corsJson(jsonRpcError(null, -32700, 'Parse error'), { status: 400 });
  }

  if (Array.isArray(payload)) {
    const responses = [];
    for (const msg of payload) {
      const r = await handleMessage(msg, ctx);
      if (r) responses.push(r);
    }
    if (responses.length === 0) return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
    return corsJson(responses);
  }

  const response = await handleMessage(payload, ctx);
  if (!response) return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
  return corsJson(response);
}

// Stateless server: no server-to-client SSE stream.
export function GET() {
  const res = NextResponse.json(
    { jsonrpc: '2.0', id: null, error: { code: -32601, message: 'Method Not Allowed: use POST' } },
    { status: 405 },
  );
  res.headers.set('Allow', 'POST, OPTIONS');
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

export function OPTIONS() {
  return handleOptions();
}
