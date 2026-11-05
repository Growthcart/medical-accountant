import type { Metadata } from 'next'

// Shared SEO building blocks: the canonical site URL, brand defaults and a
// helper that gives every page the same complete metadata (canonical, Open
// Graph with og:url and an image, Twitter card).

// Canonical origin without a trailing slash (a value like
// "https://medicalaccountant.ie/" would otherwise produce "//about" URLs).
// next.config.mjs fails production builds when it is not set.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')

export const SITE_NAME = 'MedicalAccountant.ie'

// 1200x630 social card (public/images/og-default.jpg). In Next.js a page's
// own `openGraph` object replaces the root one entirely, so pages must
// carry the image themselves; buildPageMetadata does that.
export const DEFAULT_OG_IMAGE = {
  url: '/images/og-default.jpg',
  width: 1200,
  height: 630,
  alt: 'MedicalAccountant.ie',
}

// Square raster logo for Organization structured data (Google does not
// accept SVG logos and needs at least 112x112).
export const LOGO_URL = `${SITE_URL}/images/icons/icon-512.png`

export const TWITTER_HANDLE = ''

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

interface PageMetadataInput {
  // Site path, e.g. "/seo/local-seo" ("" or "/" for the homepage).
  path: string
  // Page title without the brand; the root template adds " | MedicalAccountant.ie".
  title: string
  description: string
  // Title for social cards when it should differ from the page title.
  socialTitle?: string
  ogType?: 'website' | 'article' | 'profile'
  images?: Array<{ url: string; width?: number; height?: number; alt?: string }>
  // Serve text/markdown at the same URL (middleware content negotiation).
  markdown?: boolean
  robots?: Metadata['robots']
  // Use the title as-is, without the brand template.
  absoluteTitle?: boolean
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const url = input.path && input.path !== '/' ? absoluteUrl(input.path) : SITE_URL
  const images = input.images && input.images.length > 0 ? input.images : [DEFAULT_OG_IMAGE]
  const socialTitle = input.socialTitle || (input.absoluteTitle ? input.title : `${input.title} | ${SITE_NAME}`)
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: {
      canonical: url,
      ...(input.markdown !== false && { types: { 'text/markdown': url } }),
    },
    openGraph: {
      type: input.ogType || 'website',
      url,
      siteName: SITE_NAME,
      locale: 'en_IE',
      title: socialTitle,
      description: input.description,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title: socialTitle,
      description: input.description,
      images: images.map((i) => i.url),
    },
    ...(input.robots && { robots: input.robots }),
  }
}
