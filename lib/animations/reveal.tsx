'use client'

import { useEffect } from 'react'

// Single shared IntersectionObserver that toggles data-revealed="true"
// on any element marked with `data-reveal`. Pair with the CSS in
// globals.css: `.reveal-up { ...initial } .reveal-up[data-revealed='true'] { ...revealed }`.
//
// Mounted once via <RevealRoot /> in the (site) layout. Replaces the
// previous GSAPProvider + 8 animator client components — same visual
// (fade-up on scroll), zero animation library cost.

export function RevealRoot(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Tells the inline failsafe in app/layout.tsx that reveals are running,
    // so it keeps hidden-until-scrolled content hidden.
    document.documentElement.dataset.reveal = 'ready'

    // Reduced-motion users get instant reveal; no observer needed.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        el.dataset.revealed = 'true'
      })
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            ;(entry.target as HTMLElement).dataset.revealed = 'true'
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    )

    const observed = new Set<Element>()
    const observeAll = (): void => {
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        if (!observed.has(el) && el.dataset.revealed !== 'true') {
          observer.observe(el)
          observed.add(el)
        }
      })
    }
    observeAll()

    // Pick up any [data-reveal] elements added later (e.g. route
    // transitions). Batched to one scan per frame, since carousels mutate
    // the DOM every few seconds.
    let frame = 0
    const mutation = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0
        observeAll()
      })
    })
    mutation.observe(document.body, { childList: true, subtree: true })

    return () => {
      mutation.disconnect()
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return null
}
