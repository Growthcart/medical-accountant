import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { destroySession, getSessionUser, SESSION_COOKIE, sessionCookieOptions, tokenFromRequest } from '@/lib/auth/session';
import { escapeHtml } from '@/lib/mcp/http';
import { getClient, isPublisher, issueAuthCode, MCP_SCOPE } from '@/lib/mcp/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// OAuth authorization endpoint. Sign-in reuses the site's admin login
// (/admin/login?next=...); a signed-in admin then sees a consent screen.

interface AuthorizeParams {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  state: string;
}

function readParams(sp: URLSearchParams): AuthorizeParams {
  return {
    response_type: sp.get('response_type') || '',
    client_id: sp.get('client_id') || '',
    redirect_uri: sp.get('redirect_uri') || '',
    code_challenge: sp.get('code_challenge') || '',
    code_challenge_method: sp.get('code_challenge_method') || '',
    scope: MCP_SCOPE,
    state: sp.get('state') || '',
  };
}

const PAGE_STYLE = `body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:30rem;margin:3rem auto;padding:0 1.25rem;color:#111;background:#fff}h1{font-size:1.4rem}.card{border:1px solid #e5e7eb;border-radius:12px;padding:1.5rem;margin-top:1rem}.muted{color:#555;font-size:.95rem;line-height:1.5}button{font-size:1rem;padding:.7rem 1.1rem;border-radius:8px;border:0;cursor:pointer}.allow{background:#ff642d;color:#fff}.deny{background:#f3f4f6;color:#111;margin-left:.5rem}code{background:#f3f4f6;padding:.1rem .3rem;border-radius:4px}.link{background:none;padding:0;color:#111;text-decoration:underline;font-size:inherit}`;

// The site-wide CSP allows `form-action 'self'` only, and browsers apply
// form-action to the redirect that follows a submit, which would block the
// hand-back to the client's redirect_uri. These pages carry their own,
// tighter policy that also allows that one origin (next.config.mjs leaves
// this route out of the site-wide CSP).
function htmlResponse(html: string, status = 200, formActionOrigin?: string): NextResponse {
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    `form-action 'self'${formActionOrigin ? ` ${formActionOrigin}` : ''}`,
    // The consent form must never be framed (clickjacking).
    "frame-ancestors 'none'",
    "base-uri 'none'",
  ].join('; ');
  return new NextResponse(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': csp,
    },
  });
}

function errorPage(message: string, status = 400): NextResponse {
  return htmlResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Authorization error</title><style>${PAGE_STYLE}</style></head><body><h1>Cannot authorize</h1><p class="muted">${escapeHtml(message)}</p></body></html>`,
    status,
  );
}

function redirectWithError(redirectUri: string, error: string, state: string, description?: string): NextResponse {
  const u = new URL(redirectUri);
  u.searchParams.set('error', error);
  if (description) u.searchParams.set('error_description', description);
  if (state) u.searchParams.set('state', state);
  return NextResponse.redirect(u.toString(), 303);
}

// Validate the request and the registered client. Returns an error response,
// or null when everything is valid.
async function validate(params: AuthorizeParams): Promise<NextResponse | null> {
  if (!params.client_id || !params.redirect_uri) return errorPage('Missing client_id or redirect_uri.');
  const client = await getClient(params.client_id);
  if (!client) return errorPage('Unknown client_id. Remove and re-add the connector so it can register again.');
  if (!client.redirect_uris.includes(params.redirect_uri)) return errorPage('redirect_uri does not match the registered client.');
  // From here, errors are safe to send back to the (validated) redirect_uri.
  if (params.response_type !== 'code') return redirectWithError(params.redirect_uri, 'unsupported_response_type', params.state);
  if (!params.code_challenge || params.code_challenge_method !== 'S256') {
    return redirectWithError(params.redirect_uri, 'invalid_request', params.state, 'PKCE S256 is required');
  }
  return null;
}

// The authorize URL with the same parameters, used to come back after login.
function authorizePath(params: AuthorizeParams): string {
  const sp = new URLSearchParams({
    response_type: 'code',
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
    code_challenge: params.code_challenge,
    code_challenge_method: params.code_challenge_method,
    scope: params.scope,
  });
  if (params.state) sp.set('state', params.state);
  return `/api/oauth/authorize?${sp.toString()}`;
}

function loginRedirect(request: NextRequest, params: AuthorizeParams, status = 307): NextResponse {
  const loginUrl = new URL('/admin/login', request.nextUrl.origin);
  loginUrl.searchParams.set('next', authorizePath(params));
  return NextResponse.redirect(loginUrl.toString(), status);
}

async function currentProfile(request: NextRequest): Promise<{ userId: string; email: string | null; role: string | null; name: string | null } | null> {
  const user = await getSessionUser(request);
  if (!user) return null;
  const { data: profile } = await createServiceClient()
    .from('profiles')
    .select('role, full_name, username')
    .eq('id', user.id)
    .maybeSingle();
  return {
    userId: user.id,
    email: user.email,
    role: profile?.role ?? null,
    name: profile?.full_name || profile?.username || null,
  };
}

function consentPage(params: AuthorizeParams, displayName: string, email: string | null): NextResponse {
  const hidden = (name: string, value: string) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`;
  const target = new URL(params.redirect_uri);
  const host = target.host;
  return htmlResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Authorize publishing access</title><style>${PAGE_STYLE}</style></head><body>
<h1>Authorize publishing access</h1>
<div class="card">
<p class="muted">You are signed in as <strong>${escapeHtml(displayName)}</strong>${email ? ` (${escapeHtml(email)})` : ''}. Posts published through this connection will appear under this account.</p>
<p class="muted">An application at <code>${escapeHtml(host)}</code> is asking to create and edit posts on the MedicalAccountant.ie blog as you.</p>
<form method="post" action="/api/oauth/authorize" style="margin-top:1.25rem">
${hidden('client_id', params.client_id)}
${hidden('redirect_uri', params.redirect_uri)}
${hidden('code_challenge', params.code_challenge)}
${hidden('code_challenge_method', params.code_challenge_method)}
${hidden('state', params.state)}
<button class="allow" type="submit" name="decision" value="allow">Allow</button>
<button class="deny" type="submit" name="decision" value="deny">Deny</button>
<p class="muted" style="margin-top:1.25rem">Wrong account? <button class="link" type="submit" name="decision" value="switch">Sign out and use a different account</button></p>
</form>
</div>
</body></html>`, 200, target.origin);
}

export async function GET(request: NextRequest) {
  const params = readParams(request.nextUrl.searchParams);
  const invalid = await validate(params);
  if (invalid) return invalid;

  const me = await currentProfile(request);
  if (!me) return loginRedirect(request, params);
  if (!isPublisher(me.role)) {
    return redirectWithError(params.redirect_uri, 'access_denied', params.state, 'Account lacks publishing rights');
  }
  return consentPage(params, me.name || me.email || 'your account', me.email);
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) return errorPage('Invalid form submission.');
  const params: AuthorizeParams = {
    response_type: 'code',
    client_id: String(form.get('client_id') || ''),
    redirect_uri: String(form.get('redirect_uri') || ''),
    code_challenge: String(form.get('code_challenge') || ''),
    code_challenge_method: String(form.get('code_challenge_method') || ''),
    scope: MCP_SCOPE,
    state: String(form.get('state') || ''),
  };
  const decision = String(form.get('decision') || '');

  // The consent form is only ever posted from this site's own page.
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin && origin !== new URL(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).origin) {
    return errorPage('Cross-site form submission rejected.', 403);
  }

  const invalid = await validate(params);
  if (invalid) return invalid;

  // Sign out of the site, then log in again and come back to this screen.
  if (decision === 'switch') {
    const token = await tokenFromRequest(request);
    if (token) await destroySession(token);
    const res = loginRedirect(request, params, 303);
    res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
    return res;
  }

  const me = await currentProfile(request);
  if (!me) return errorPage('Your session expired. Start the connection again from Claude.', 401);
  if (!isPublisher(me.role)) {
    return redirectWithError(params.redirect_uri, 'access_denied', params.state, 'Account lacks publishing rights');
  }
  if (decision !== 'allow') {
    return redirectWithError(params.redirect_uri, 'access_denied', params.state, 'User denied the request');
  }

  const code = await issueAuthCode({
    clientId: params.client_id,
    userId: me.userId,
    redirectUri: params.redirect_uri,
    codeChallenge: params.code_challenge,
    codeChallengeMethod: params.code_challenge_method,
    scope: params.scope,
  });

  const u = new URL(params.redirect_uri);
  u.searchParams.set('code', code);
  if (params.state) u.searchParams.set('state', params.state);
  return NextResponse.redirect(u.toString(), 303);
}
