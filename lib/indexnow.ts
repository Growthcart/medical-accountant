// IndexNow client — pushes URL change notifications to Bing, Yandex,
// Seznam, Naver, and Yep so they re-crawl within minutes instead of days.
// https://www.indexnow.org/documentation
//
// Setup:
//   1. Generate a 32-character hex key (e.g. `openssl rand -hex 16`).
//   2. Set INDEXNOW_KEY in env (Vercel environment variable + .env.local).
//   3. The key is served at /indexnow-key.txt for ownership verification.
//   4. notifyIndexNow() is called from /api/revalidate on each post update.

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow'

interface SubmitResult {
  ok: boolean
  status?: number
  error?: string
}

export async function notifyIndexNow(urls: string[]): Promise<SubmitResult> {
  const key = process.env.INDEXNOW_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!key) return { ok: false, error: 'INDEXNOW_KEY not configured' }
  if (!siteUrl) return { ok: false, error: 'NEXT_PUBLIC_SITE_URL not configured' }
  if (urls.length === 0) return { ok: true }

  const host = new URL(siteUrl).host
  const payload = {
    host,
    key,
    keyLocation: `${siteUrl}/indexnow-key.txt`,
    urlList: urls,
  }

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    })
    // 200 = accepted, 202 = accepted but URLs queued, 400/422 = bad payload
    if (response.ok || response.status === 202) {
      return { ok: true, status: response.status }
    }
    return { ok: false, status: response.status, error: await response.text() }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
