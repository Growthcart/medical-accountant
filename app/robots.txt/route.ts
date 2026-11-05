import { NextResponse } from 'next/server'
import { SITE_URL as siteUrl } from '@/lib/seo'

// robots.txt: the site was open to everything except /api/; now /admin is off limits too, and search, answer-engine
// and AI crawlers are named so they stay allowed.

export const dynamic = 'force-static'
export const revalidate = 3600

const AI_CRAWLERS = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Bingbot", "CCBot", "Applebot-Extended"]

export function GET(): NextResponse {
  const body = [
    '# robots.txt for MedicalAccountant.ie',
    '',
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin',
    '',
    ...AI_CRAWLERS.map((a) => `User-agent: ${a}`),
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    `Sitemap: ${siteUrl}/image-sitemap.xml`,
    '',
    `# News feed: ${siteUrl}/feed.xml`,
    '',
  ].join('\n')

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
