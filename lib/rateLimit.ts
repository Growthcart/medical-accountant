import { createServiceClient } from '@/lib/db/server'

// Fixed-window counter per key, kept in the rate_limits table so it holds
// across Worker instances. Two concurrent requests can both read the same
// count, so the limit is approximate under bursts: fine for abuse control,
// not for exact quotas.
//
// Fails open: if the database errors we allow the request and log it,
// rather than block legitimate traffic.

interface RateLimitResult {
  allowed: boolean
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const db = createServiceClient()
    const now = new Date()
    const { data: row } = await db.from('rate_limits').select('count, window_start').eq('key', key).maybeSingle()

    if (!row || Date.parse(row.window_start) < now.getTime() - windowSeconds * 1000) {
      await db.from('rate_limits').upsert({ key, count: 1, window_start: now.toISOString() })
      return { allowed: true }
    }
    const { data: bumped, error } = await db
      .from('rate_limits')
      .update({ count: row.count + 1 })
      .eq('key', key)
      .select('count')
      .maybeSingle()
    if (error) {
      console.error('[rateLimit] update failed:', error.message)
      return { allowed: true }
    }
    return { allowed: (bumped?.count ?? row.count + 1) <= maxRequests }
  } catch (err) {
    console.error('[rateLimit] unexpected error:', err)
    return { allowed: true }
  }
}

// Client IP: Vercel puts the real client first in x-forwarded-for (cf-connecting-ip is kept for Cloudflare-fronted setups).
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
