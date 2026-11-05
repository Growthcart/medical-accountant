import { NextResponse } from 'next/server'

// Read from the database on every request (no ISR cache is configured).
export const dynamic = 'force-dynamic';

// IndexNow ownership-verification file. Hosts the value of INDEXNOW_KEY
// at /indexnow-key.txt so the IndexNow API can confirm we own this domain.
// The key itself is a 32-character hex string; rotate it by changing the
// env var (no code change needed).

// Cached for a day rather than frozen at build time, so setting or
// rotating INDEXNOW_KEY does not need a redeploy to take effect.

export function GET(): NextResponse {
  const key = process.env.INDEXNOW_KEY
  if (!key) {
    return new NextResponse('INDEXNOW_KEY not configured', { status: 404 })
  }
  return new NextResponse(key, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
