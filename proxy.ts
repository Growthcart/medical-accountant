import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'
import { runQuery } from '@/lib/db/exec'
import { dbEnv } from '@/lib/db/env'

// Rate limiting lives on individual API routes via lib/rateLimit.ts.

// --- URL Redirect Cache ---
type RedirectEntry = { to_path: string; status_code: number; id: string; hit_count: number }
let redirectCache: Map<string, RedirectEntry> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60_000
// After a failed load, keep the last good list and try again sooner.
const RETRY_AFTER_ERROR = 10_000
const PAGE_SIZE = 1000

async function loadRedirects(): Promise<Map<string, RedirectEntry>> {
  const db = dbEnv().DB
  const map = new Map<string, RedirectEntry>()
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await runQuery(db, {
      table: 'url_redirects',
      op: 'select',
      select: 'id, from_path, to_path, status_code, hit_count',
      filters: [],
      orders: [{ col: 'created_at', asc: true }],
      range: [from, from + PAGE_SIZE - 1],
    })
    if (error) throw new Error(error.message)
    for (const r of data || []) {
      const entry = { to_path: r.to_path, status_code: r.status_code, id: r.id, hit_count: r.hit_count || 0 }
      const withoutSlash = r.from_path.length > 1 ? r.from_path.replace(/\/+$/, '') : r.from_path
      map.set(withoutSlash, entry)
      map.set(`${withoutSlash}/`, entry)
    }
    if (!data || data.length < PAGE_SIZE) break
  }
  return map
}

async function getRedirects(): Promise<Map<string, RedirectEntry>> {
  if (redirectCache && Date.now() - cacheTimestamp < CACHE_TTL) return redirectCache
  try {
    redirectCache = await loadRedirects()
    cacheTimestamp = Date.now()
  } catch {
    // Keep serving the previous list (if any) and retry shortly.
    if (!redirectCache) redirectCache = new Map()
    cacheTimestamp = Date.now() - CACHE_TTL + RETRY_AFTER_ERROR
  }
  return redirectCache
}

// DB-managed redirect for this path, if any. Counts the hit in the background.
async function redirectFor(request: NextRequest, event: NextFetchEvent): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname
  if (path.startsWith('/admin') || path.startsWith('/api/')) return null
  try {
    const redirect = (await getRedirects()).get(path)
    if (!redirect) return null
    event.waitUntil(
      runQuery(dbEnv().DB, {
        table: 'url_redirects',
        op: 'update',
        values: { hit_count: (redirect.hit_count || 0) + 1, last_hit_at: new Date().toISOString() },
        filters: [{ col: 'id', op: 'eq', val: redirect.id }],
        orders: [],
      }).then(() => {}, () => {}),
    )
    return NextResponse.redirect(new URL(redirect.to_path, request.url), redirect.status_code)
  } catch {
    return null
  }
}

// Paths that should NEVER be rewritten to markdown — admin, api routes,
// _next assets, static files. Everything else is fair game.
function isMarkdownConvertible(path: string): boolean {
  if (path.startsWith('/api')) return false
  if (path.startsWith('/admin')) return false
  if (path.startsWith('/_next')) return false
  // Asset-ish paths (anything with a file extension other than a clean URL).
  if (/\.[a-z0-9]{2,5}$/i.test(path)) return false
  return true
}

function clientWantsMarkdown(accept: string | null): boolean {
  if (!accept) return false
  const lower = accept.toLowerCase()
  if (!lower.includes('text/markdown')) return false
  const htmlIdx = lower.indexOf('text/html')
  const mdIdx = lower.indexOf('text/markdown')
  return htmlIdx === -1 || mdIdx < htmlIdx
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const path = request.nextUrl.pathname

  // Moved pages redirect first, for every kind of request (including
  // markdown requests below), so old URLs never 404.
  const moved = await redirectFor(request, event)
  if (moved) return moved

  // 0. Markdown content negotiation — Accept: text/markdown gets rewritten
  // to /api/markdown?path=<original>. The handler decides how to render
  // (blog post body, blog list, or generic HTML→md). The internal HTML
  // fetch the handler does is guarded with x-markdown-internal so this
  // check skips it cleanly.
  if (
    request.method === 'GET' &&
    !request.headers.get('x-markdown-internal') &&
    clientWantsMarkdown(request.headers.get('accept')) &&
    isMarkdownConvertible(path)
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/api/markdown'
    url.searchParams.set('path', path)
    // Pass the path as a header too: after a rewrite the handler's
    // request.nextUrl reflects the ORIGINAL request URL, so the search
    // param above is not reliably readable. The header always survives.
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-md-path', path)
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  // Only the rewrite above may set x-md-path. A client sending it straight to
  // /api/markdown could otherwise get one page's markdown served (and cached)
  // under another page's URL.
  if (path === '/api/markdown' && request.headers.has('x-md-path')) {
    const headers = new Headers(request.headers)
    headers.delete('x-md-path')
    return NextResponse.next({ request: { headers } })
  }

  return NextResponse.next({ request })
}

export const config = {
  // Static files and generated feeds/sitemaps need neither redirects nor
  // markdown negotiation.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml|json|webmanifest|woff2?|ttf|mp4|webm|pdf)$).*)'],
}
