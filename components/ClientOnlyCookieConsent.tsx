'use client'

import { useEffect, useState } from 'react'
import CookieConsentBanner from './CookieConsentBanner'

// Mounts the cookie banner on the client only, after idle, without using
// next/dynamic({ ssr: false }). Using next/dynamic from a server-component
// layout emits a <template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING">
// marker into the streamed HTML. This wrapper avoids that marker — the
// element renders nothing on the server, then defers mount via
// requestIdleCallback so the banner JS doesn't compete with first paint.
export default function ClientOnlyCookieConsent(): React.ReactElement | null {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number
      cancelIdleCallback?: (id: number) => void
    }).requestIdleCallback

    const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback

    if (typeof ric === 'function') {
      const id = ric(() => setMounted(true), { timeout: 2000 })
      return () => {
        if (typeof cic === 'function') cic(id)
      }
    }

    const id = window.setTimeout(() => setMounted(true), 1000)
    return () => window.clearTimeout(id)
  }, [])

  if (!mounted) return null
  return <CookieConsentBanner />
}
