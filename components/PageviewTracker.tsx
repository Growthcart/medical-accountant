'use client'

import { useEffect, useRef, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

function PageviewListener(): null {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirstRender = useRef(true)

  useEffect(() => {
    // The initial page_view is already fired by gtag('config', ...) in
    // TrackingScripts and by fbq('track', 'PageView') in the Meta init.
    // Skip the first render so we don't double-count it; only fire on
    // subsequent SPA route changes.
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (typeof window === 'undefined') return

    const queryString = searchParams?.toString()
    const url = queryString ? `${pathname}?${queryString}` : pathname

    // Visible debug marker — remove once tracking is verified.
    // eslint-disable-next-line no-console
    console.log('[Pageview]', url, {
      gtag: typeof window.gtag === 'function',
      fbq: typeof window.fbq === 'function',
    })

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: url,
        page_location: window.location.href,
        page_title: document.title,
      })
    }

    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView')
    }
  }, [pathname, searchParams])

  return null
}

export default function PageviewTracker(): React.ReactElement {
  // useSearchParams must be wrapped in Suspense for static rendering.
  return (
    <Suspense fallback={null}>
      <PageviewListener />
    </Suspense>
  )
}
