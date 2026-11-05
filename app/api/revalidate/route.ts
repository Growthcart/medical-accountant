import { timingSafeEqual } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeApiRequest } from '@/lib/api-auth'
import { pingIndexNow, revalidatePostPaths } from '@/lib/blog/revalidate'
import { applyCategoryRename, applyPostChange } from '@/lib/blog/postChanges'
import { getPostUrlStructure } from '@/lib/blog/postUrlStructure'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Refreshes cached pages after content changes, and keeps old URLs working.
//
// Callers:
//   - The admin editor (signed-in admin, Bearer access token) after saving,
//     publishing, deleting or featuring a post, or renaming a category:
//       { postId, previous?: { slug, categorySlug, status } }
//       { previous: { slug, categorySlug } }                  (deleted post)
//       { category: { id, oldSlug, newSlug } }                (category rename)
//       { site: true }                    (site settings: banners, tracking)
//   - Webhooks with the x-revalidation-secret header, or integrations with
//     POSTS_API_KEY: { slug, categorySlug }. Sanity-style `{ current }` slugs
//     are accepted.

const slugField = z
  .union([z.string(), z.object({ current: z.string() })])
  .optional()
  .transform((v) => (typeof v === 'object' ? v.current : v))

const bodySchema = z.object({
  slug: slugField,
  categorySlug: slugField,
  postId: z.string().min(1).optional(),
  previous: z
    .object({
      slug: z.string().nullish(),
      categorySlug: z.string().nullish(),
      status: z.string().nullish(),
    })
    .optional(),
  category: z
    .object({ id: z.string().min(1), oldSlug: z.string().min(1), newSlug: z.string().min(1) })
    .optional(),
  site: z.literal(true).optional(),
})

function hasValidSecret(request: NextRequest): boolean {
  const expected = process.env.REVALIDATION_SECRET
  const presented = request.headers.get('x-revalidation-secret')
  if (!expected || !presented) return false
  const a = Buffer.from(presented)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let userId: string | null = null
  if (!hasValidSecret(request)) {
    const auth = await authorizeApiRequest(request)
    if (!auth.ok) return NextResponse.json({ message: auth.error }, { status: auth.status })
    if (auth.via === 'session') userId = auth.userId
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 })
  }

  try {
    let paths: string[]
    if (body.site) {
      // Every page renders the site settings (banners, verification tag).
      revalidatePath('/', 'layout')
      paths = ['/**']
    } else if (body.category) {
      paths = await applyCategoryRename({ categoryId: body.category.id, ...body.category, createdBy: userId })
    } else if (body.postId || body.previous) {
      paths = await applyPostChange({ postId: body.postId, previous: body.previous, createdBy: userId })
    } else {
      const structure = await getPostUrlStructure()
      paths = revalidatePostPaths({ slug: body.slug, categorySlug: body.categorySlug, structure })
      if (body.slug) await pingIndexNow({ slug: body.slug, categorySlug: body.categorySlug ?? null, structure })
    }
    return NextResponse.json({ revalidated: true, paths, now: Date.now() })
  } catch (error) {
    console.error('[Revalidate API] failed:', error)
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 })
  }
}
