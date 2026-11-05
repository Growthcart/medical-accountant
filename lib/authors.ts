// Per-author metadata for schema.org Person entities.
//
// Authoritative source: the `profiles` table, which now stores
// job_title, linkedin_url, twitter_handle, website_url alongside the
// existing full_name / bio / profile_photo_url. New authors get rich
// schema markup automatically when an admin edits their profile.
//
// This module also keeps a small in-code `AUTHOR_META` map for two cases:
//   1. Topical expertise (`knowsAbout`) — not yet a profiles column.
//   2. Authors whose DB row hasn't been backfilled with the new fields.

export interface AuthorMeta {
  jobTitle?: string
  description?: string
  sameAs?: string[]
  knowsAbout?: string[]
}

// Optional per-author extras for Person schema, keyed by full name.
// Example: 'Jane Doe': { jobTitle: 'Editor', description: '...', sameAs: ['https://...'], knowsAbout: ['...'] }
const AUTHOR_META: Record<string, AuthorMeta> = {}

/**
 * The named expert credited as reviewer on the service pages (E-E-A-T).
 * Must be a key in the AUTHOR_META map above.
 */
export const SITE_REVIEWER_NAME = 'Vijay Rathee'

export function getAuthorMeta(fullName: string | null | undefined): AuthorMeta | null {
  if (!fullName) return null
  return AUTHOR_META[fullName] ?? null
}

/**
 * True when a byline is the company itself (e.g. a "MedicalAccountant.ie" account)
 * rather than a person. Such posts credit the site Organization as author
 * instead of emitting a Person entity for the brand.
 */
export function isBrandAuthor(fullName: string | null | undefined, organisationName: string | null | undefined): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/(ltd|limited)$/, '')
  if (!fullName) return false
  const name = norm(fullName)
  return Boolean(name) && [organisationName, 'MedicalAccountant.ie'].some((org) => Boolean(org) && norm(org as string) === name)
}

/** URL-safe slug from a person's display name. Used to build a stable @id. */
export function authorSlug(fullName: string): string {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Shape of the profile fields a blog post page passes to the schema builder.
 * Matches the author columns on `profiles`.
 */
export interface AuthorProfileFields {
  full_name: string | null
  bio?: string | null
  profile_photo_url?: string | null
  job_title?: string | null
  linkedin_url?: string | null
  twitter_handle?: string | null
  website_url?: string | null
}

/**
 * Resolves the final author metadata by merging DB profile fields with the
 * static `AUTHOR_META` map. DB takes precedence — once a row has
 * `linkedin_url` populated, the static fallback is ignored.
 */
export function resolveAuthorMeta(profile: AuthorProfileFields | null): AuthorMeta {
  const fromMap = profile?.full_name ? getAuthorMeta(profile.full_name) : null

  const sameAsSet = new Set<string>()
  if (profile?.linkedin_url) sameAsSet.add(profile.linkedin_url)
  if (profile?.twitter_handle) {
    const handle = profile.twitter_handle.replace(/^@/, '')
    if (handle) sameAsSet.add(`https://x.com/${handle}`)
  }
  if (profile?.website_url) sameAsSet.add(profile.website_url)
  if (sameAsSet.size === 0 && fromMap?.sameAs) {
    for (const url of fromMap.sameAs) sameAsSet.add(url)
  }

  return {
    jobTitle: profile?.job_title || fromMap?.jobTitle || undefined,
    description: fromMap?.description || profile?.bio || undefined,
    sameAs: sameAsSet.size > 0 ? Array.from(sameAsSet) : undefined,
    knowsAbout: fromMap?.knowsAbout,
  }
}
