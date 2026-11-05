import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/db/server'

// Read from the database on every request (no ISR cache is configured).
export const dynamic = 'force-dynamic';

// GET /og/posts/{slug}: generated Open Graph card for a post (title, author,
// brand). The post page points og:image here when the post has no image of
// its own. A route handler rather than an opengraph-image file because that
// file convention cannot sit under the /posts/[...slug] catch-all.

export const runtime = 'nodejs'

const size = { width: 1200, height: 630 }

interface Props {
  params: Promise<{ slug: string }>
}

async function loadPost(postSlug: string) {
  try {
    const db = createServiceClient()
    const { data } = await db
      .from('posts')
      .select('title, excerpt, og_image, featured_image_url, profiles(full_name)')
      .eq('slug', postSlug)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .maybeSingle()
    if (!data) return null
    const profile = data.profiles as { full_name: string | null } | null
    return {
      title: data.title as string,
      excerpt: (data.excerpt as string | null) || null,
      authorName: profile?.full_name || 'MedicalAccountant.ie',
      // If the admin uploaded a bespoke OG image, prefer it — return null
      // to signal "use the per-post image, not the generated template".
      customOgImage: (data.og_image as string | null) || (data.featured_image_url as string | null) || null,
    }
  } catch (err) {
    console.error('[opengraph-image] failed to load post', err)
    return null
  }
}

export async function GET(_request: Request, { params }: Props): Promise<Response> {
  const { slug } = await params
  const post = await loadPost(slug)
  const title = post?.title || 'MedicalAccountant.ie'
  const author = post?.authorName || 'MedicalAccountant.ie'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background:
            'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top-left brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: '#ff642d',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 36,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            G
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: 'white', fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>
              MedicalAccountant.ie
            </div>
            <div style={{ color: '#898989', fontSize: 18, marginTop: 4 }}>
              medicalaccountant.ie
            </div>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            color: 'white',
            fontSize: title.length > 90 ? 52 : 64,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            maxWidth: '1056px',
          }}
        >
          {title}
        </div>

        {/* Footer: author + accent */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: 32,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#898989', fontSize: 22, marginBottom: 4 }}>by</div>
            <div style={{ color: 'white', fontSize: 32, fontWeight: 600 }}>{author}</div>
          </div>
          <div
            style={{
              color: '#ff642d',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Blog →
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
