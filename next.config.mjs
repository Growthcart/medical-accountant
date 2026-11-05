/** @type {import('next').NextConfig} */

// Canonical URLs, sitemaps, feeds and OAuth metadata are all built from
// NEXT_PUBLIC_SITE_URL; a production build without it would ship
// http://localhost:3000 everywhere.
if (process.env.VERCEL_ENV === 'production' && !process.env.NEXT_PUBLIC_SITE_URL) {
  throw new Error('NEXT_PUBLIC_SITE_URL must be set for production builds (e.g. https://medicalaccountant.ie)')
}

// Uploaded files are served from this site (/files/...) unless NEXT_PUBLIC_R2_PUBLIC_URL points at a public CDN/bucket domain.
const r2Origin = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).origin : ''

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // X-XSS-Protection was removed — Chrome/Firefox dropped support in 2019
  // and modern security scanners (Mozilla Observatory, securityheaders.com)
  // sometimes ding sites for sending it. The CSP below covers what it did.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.googletagmanager.com https://*.google-analytics.com https://connect.facebook.net https://static.ads-twitter.com https://snap.licdn.com https://analytics.tiktok.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Tracking pixels (Google Ads/GA4 signals, LinkedIn, X) as well as
      // site images.
      `img-src 'self' ${r2Origin} https://images.unsplash.com https://*.google-analytics.com https://*.googletagmanager.com https://*.facebook.com https://*.doubleclick.net https://www.google.com https://www.google.co.uk https://px.ads.linkedin.com https://analytics.twitter.com https://t.co data:`,
      "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
      "connect-src 'self' https://*.google-analytics.com https://*.googletagmanager.com https://*.doubleclick.net https://www.google.com https://*.facebook.com https://connect.facebook.net https://analytics.tiktok.com https://px.ads.linkedin.com https://analytics.twitter.com",
      // Video and map embeds that blog posts may contain.
      "frame-src 'self' https://www.googletagmanager.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.loom.com https://www.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; ')
  },
]

const nextConfig = {
  // Keeps the WordPress-style URLs (/gp-accountants/) of the original site.
  trailingSlash: true,
  // Next adds the trailing slash itself (308, which keeps POST bodies, so API calls without it still work).
  env: {
    // Build time, used as the sitemap lastmod for static pages (it changes
    // only when the site is redeployed).
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
  },
  images: {
    // Files are served as stored (no Vercel image-optimisation quota used).
    unoptimized: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-image',
      '@tiptap/extension-link',
      '@tiptap/extension-placeholder',
    ],
  },
  // The public pages carry inline scripts and load assets from several hosts, so the strict CSP only
  // covers the admin and the API.
  async headers() {
    const csp = securityHeaders.filter((h) => h.key === 'Content-Security-Policy')
    const noCsp = securityHeaders.filter((h) => h.key !== 'Content-Security-Policy')
    return [
      { source: '/:path*', headers: noCsp },
      {
        // The OAuth consent screen (/api/oauth/authorize) sends its own CSP:
        // it must allow the form to hand back to the MCP client's redirect URI.
        source: '/api/:path((?!oauth/authorize).*)',
        headers: csp,
      },
      { source: '/admin/:path*', headers: csp },
      {
        // Private admin area: never indexed, whatever the page renders.
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/admin',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      // Production only: in dev the same chunk URL changes content on every edit, and an
      // immutable header makes the browser keep serving stale CSS and JS.
      ...(process.env.NODE_ENV === 'production'
        ? [{ source: '/_next/static/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }]
        : []),
    ]
  },
  async rewrites() {
    return [
      // OAuth discovery for the Claude connector (MCP). Clients may append
      // the resource or issuer path (RFC 9728 / RFC 8414), so both forms map
      // to the same documents.
      {
        source: '/.well-known/oauth-protected-resource/:path*',
        destination: '/well-known/oauth-protected-resource',
      },
      {
        source: '/.well-known/oauth-protected-resource',
        destination: '/well-known/oauth-protected-resource',
      },
      {
        source: '/.well-known/oauth-authorization-server/:path*',
        destination: '/well-known/oauth-authorization-server',
      },
      {
        source: '/.well-known/oauth-authorization-server',
        destination: '/well-known/oauth-authorization-server',
      },
    ]
  },
  async redirects() {
    return [
      { source: '/category/news', destination: '/news/', permanent: true },
      // WordPress feed and Rank Math sitemaps that Google already knows about.
      { source: '/feed', destination: '/feed.xml', permanent: true },
      { source: '/sitemap_index.xml', destination: '/sitemap.xml', permanent: true },
      { source: '/wp-sitemap.xml', destination: '/sitemap.xml', permanent: true },
      { source: '/post-sitemap.xml', destination: '/sitemap.xml', permanent: true },
      { source: '/page-sitemap.xml', destination: '/sitemap.xml', permanent: true },
      { source: '/category-sitemap.xml', destination: '/sitemap.xml', permanent: true },
    ]
  },
  poweredByHeader: false,
}

export default nextConfig
