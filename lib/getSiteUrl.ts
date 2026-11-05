// Resolves the canonical site URL (see SITE_URL in lib/seo.ts).
//
// Earlier this read the `Host` header so preview deployments could self-report
// their hostname, but doing so calls `headers()` which opts every page that
// invokes `generateMetadata()` into dynamic rendering — disabling caching for the
// entire marketing tree. Canonical URLs should always point at production
// regardless of preview host, so the env var is the right source.
//
// Function stays async + returns Promise<string> so existing `await` callers
// don't need to change.

import { SITE_URL } from './seo'

export async function getSiteUrl(): Promise<string> {
  return SITE_URL
}
