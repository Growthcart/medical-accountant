import { Metadata } from 'next';
import { createServiceClient } from '@/lib/db/server';
import {
  assembleGraph,
  buildArticleEntity,
  buildBreadcrumbEntity,
  buildFAQEntity,
  buildIds,
  buildImageEntity,
  buildPersonEntity,
  buildWebPageEntity,
  buildWebSiteEntity,
  jsonLdScript,
} from '@/lib/schemaBuilder';
import { buildLocalBusinessEntity, type BusinessInfo } from '@/lib/businessSchema';
import { isBrandAuthor, resolveAuthorMeta } from '@/lib/authors';
import { notFound } from 'next/navigation';
import { getSiteUrl } from '@/lib/getSiteUrl';
import { sanitizeInlineHtml, sanitizePostHtml } from '@/lib/blog/sanitizePostHtml';
import { connection } from 'next/server';
import { ContactPanel } from '@/components/Sections';
import '@/app/css/blog-post.css';
import { clipDescription, descriptionFromBody, plain } from '@/lib/blog/format';
import { authorHref, getRelatedPosts } from '@/lib/blog/listing';
import { extractFaqFromContent } from '@/lib/blog/faq';
import { postPath } from '@/lib/blog/postUrl';
import { getPostUrlStructure } from '@/lib/blog/postUrlStructure';



interface PostWithRelations {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  featured_image_credit: string | null;
  category_id: string | null;
  author_id: string | null;
  status: string;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  schema_type: string | null;
  media_type: string | null;
  media_url: string | null;
  media_caption: string | null;
  media_credit: string | null;
  categories: { name: string; slug: string } | null;
  profiles: {
    username?: string | null;
    full_name: string | null;
    profile_photo_url: string | null;
    bio: string | null;
    job_title: string | null;
    linkedin_url: string | null;
    twitter_handle: string | null;
    website_url: string | null;
  } | null;
}

interface PostTagWithRelation {
  tags: { name: string; slug: string } | null;
}



// Metadata for /{slug}/ when the slug is a CMS post (the page route calls this for anything that is not one of the site's own pages).
export async function postMetadata(postSlug: string): Promise<Metadata> {
  try {
    const db = createServiceClient();
    const { data: post } = await db
      .from('posts')
      .select('id, title, excerpt, content, og_title, og_description, og_image, featured_image_url, featured_image_alt, canonical_url, published_at, updated_at, profiles(full_name), categories(name, slug)')
      .eq('slug', postSlug)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .maybeSingle();

    if (!post) return { title: 'Post Not Found' };

    const postCategory = post.categories as { name: string; slug: string } | null;
    // A request on the other URL layout (or the wrong category) is redirected by the page itself.
    const structure = await getPostUrlStructure();
    const path = postPath(postSlug, postCategory?.slug, structure);

    const siteUrl = await getSiteUrl();
    // The description override or excerpt, cut cleanly to 160 characters so
    // Google shows it whole (the editor and MCP preflight also warn above
    // 160). Only a post with neither falls back to the opening of the body.
    const descriptionSource = plain(post.og_description) || plain(post.excerpt);
    const autoDescription =
      (descriptionSource ? clipDescription(descriptionSource) : descriptionFromBody(post.content)) || undefined;
    const ogTitle = post.og_title || post.title;
    // Long titles drop the " | MedicalAccountant.ie" suffix so the words that matter
    // fit in the ~60 characters Google shows. Set a shorter SEO title in the
    // editor (og_title) for posts with very long headlines.
    const searchTitle = { absolute: ogTitle };
    const ogImageUrl = post.og_image || post.featured_image_url;
    // Width/height help crawlers reserve preview space and reduce layout
    // shift on social cards. We don't track per-image dimensions in the
    // posts table, so we declare the OG-recommended 1200x630 — crawlers
    // verify by fetching the actual image anyway.
    // Posts without an image get the generated card (app/og/posts/[slug]).
    const ogImages = [{
      url: ogImageUrl || `${siteUrl}/og/posts/${postSlug}`,
      alt: post.featured_image_alt || post.title,
      width: 1200,
      height: 630,
    }];
    const canonicalUrl = (post as { canonical_url?: string | null }).canonical_url || `${siteUrl}${path}`;

    const authorName = (post.profiles as { full_name: string | null } | null)?.full_name || null;

    const { data: postTags } = await db
      .from('post_tags')
      .select('tags(name, slug)')
      .eq('post_id', (post as { id: string }).id) as unknown as { data: PostTagWithRelation[] | null };
    const tagNames = (postTags || [])
      .map((pt) => pt.tags?.name)
      .filter((n): n is string => Boolean(n));

    return {
      title: searchTitle,
      description: autoDescription,
      keywords: tagNames.length > 0 ? tagNames : undefined,
      authors: authorName ? [{ name: authorName }] : undefined,
      alternates: { canonical: canonicalUrl, types: { 'text/markdown': canonicalUrl } },
      openGraph: {
        type: 'article',
        url: canonicalUrl,
        title: ogTitle,
        description: autoDescription,
        siteName: 'MedicalAccountant.ie',
        locale: 'en_IE',
        images: ogImages,
        publishedTime: post.published_at || undefined,
        modifiedTime: post.updated_at || undefined,
        authors: authorName ? [authorName] : undefined,
        section: postCategory?.name || undefined,
        tags: tagNames.length > 0 ? tagNames : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        site: '',
        creator: '',
        title: ogTitle,
        description: autoDescription,
        images: ogImages.map((i) => i.url),
      },
    };
  } catch {
    return { title: 'Post Not Found' };
  }
}

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export default async function PostPage({ slug: postSlug }: { slug: string }) {
  // Posts are read from the database on every request, so an edit in the admin shows straight away.
  await connection();
  let post: PostWithRelations | null = null;

  try {
    const db = createServiceClient();

    // Try the SELECT that pulls in the author-entity columns added by the
    // SQL migration. If they don't exist yet (Postgres 42703), fall back
    // to the original join so the page still renders. The Person schema
    // entity then falls back to AUTHOR_META for any missing fields.
    const fullSelect = '*, categories(name, slug), profiles(username, full_name, profile_photo_url, bio, job_title, linkedin_url, twitter_handle, website_url)';
    const baseSelect = '*, categories(name, slug), profiles(username, full_name, profile_photo_url, bio)';
    const now = new Date().toISOString();
    let queryResult = await db
      .from('posts')
      .select(fullSelect)
      .eq('slug', postSlug)
      .eq('status', 'published')
      .lte('published_at', now)
      .maybeSingle();
    if (queryResult.error) {
      const code = (queryResult.error as { code?: string; message?: string }).code;
      const msg = (queryResult.error as { message?: string }).message || '';
      if (code === '42703' || msg.toLowerCase().includes('column')) {
        queryResult = await db
          .from('posts')
          .select(baseSelect)
          .eq('slug', postSlug)
          .eq('status', 'published')
          .lte('published_at', now)
          .maybeSingle();
      }
    }

    post = (queryResult.data as unknown) as PostWithRelations | null;

    if (!post) notFound();

  } catch (err) {
    // notFound() throws a special Next.js error — let it propagate
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    console.error('[PostPage] Failed to fetch post:', err);
    notFound();
  }

  const db = createServiceClient();
  const [{ data: postTags }, { data: business }, { data: siteSettings }, relatedPosts] = await Promise.all([
    db
      .from('post_tags')
      .select('tags(name, slug)')
      .eq('post_id', post.id) as unknown as Promise<{ data: PostTagWithRelation[] | null }>,
    db
      .from('business_info')
      .select('business_name, logo_url')
      .eq('id', '00000000-0000-0000-0000-000000000002')
      .maybeSingle(),
    db
      .from('site_settings')
      .select('post_html_block_enabled, post_html_block_content')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .maybeSingle(),
    getRelatedPosts(post.id, post.category_id),
  ]);

  const category = post.categories;
  const authorName = post.profiles?.full_name ?? null;
  const authorPhoto = post.profiles?.profile_photo_url ?? null;
  const authorBio = post.profiles?.bio ?? null;
  const authorPath = authorHref(post.profiles);

  const tags = postTags
    ?.map((pt) => pt.tags)
    .filter(Boolean) as { name: string; slug: string }[] | undefined;

  const siteUrl = await getSiteUrl();
  const postUrl = `${siteUrl}${postPath(post.slug, category?.slug, await getPostUrlStructure())}`;

  // Assemble a single JSON-LD @graph for this page — WebSite, Organization,
  // WebPage, BlogPosting, Person (author), ImageObject, BreadcrumbList all
  // linked by stable @ids. Replaces the previous two flat scripts.
  const ids = buildIds(siteUrl, postUrl);
  const authorMeta = resolveAuthorMeta(post.profiles);
  const authorLinkedin = post.profiles?.linkedin_url || authorMeta.sameAs?.find((u) => u.includes('linkedin.com')) || null;
  // A post bylined by the company account is credited to the Organization
  // (same @id as the site publisher) rather than a Person named after it.
  const brandAuthor = isBrandAuthor(authorName, business?.business_name);
  const authorId = authorName && !brandAuthor ? ids.person(authorName) : ids.organization;
  const businessForOrg: BusinessInfo = {
    business_name: business?.business_name || 'MedicalAccountant.ie',
    business_category: 'Accounting Service',
    logo_url: business?.logo_url || null,
    description: null,
    address_street: null,
    address_city: null,
    address_state: null,
    address_postal_code: null,
    address_country: null,
    contact_phone: null,
    contact_email: null,
    social_facebook: null,
    social_twitter: null,
    social_instagram: null,
    social_linkedin: null,
    social_youtube: null,
    social_tiktok: null,
    social_github: null,
  };

  const breadcrumbItems = [
    { name: 'Home', url: siteUrl },
    { name: 'Blog', url: `${siteUrl}/news` },
    ...(category ? [{ name: category.name, url: `${siteUrl}/news/category/${category.slug}` }] : []),
    { name: post.title, url: postUrl },
  ];

  // Post bodies may carry their own JSON-LD. The sanitiser strips those
  // <script> blocks, so any Article/BlogPosting pasted into a body is never
  // re-emitted (the graph below holds the page's only article entity). FAQ
  // answers are kept: they join the graph and PostFaq shows them on the page.
  const faqItems = extractFaqFromContent(post.content);

  const graph = assembleGraph([
    buildWebSiteEntity({
      id: ids.website,
      url: siteUrl,
      name: 'MedicalAccountant.ie',
      publisherId: ids.organization,
    }),
    buildLocalBusinessEntity(businessForOrg, siteUrl, ids.organization, {
    }),
    buildWebPageEntity({
      id: ids.webPage,
      url: postUrl,
      name: post.title,
      description: post.excerpt || undefined,
      isPartOfId: ids.website,
      breadcrumbId: ids.breadcrumb,
      primaryImageId: post.featured_image_url ? ids.primaryImage : undefined,
      datePublished: post.published_at,
      dateModified: post.updated_at,
    }),
    ...(post.featured_image_url
      ? [buildImageEntity({
          id: ids.primaryImage,
          url: post.featured_image_url,
          alt: post.featured_image_alt || post.title,
          width: 1200,
          height: 630,
        })]
      : []),
    ...(authorName && !brandAuthor
      ? [buildPersonEntity({
          id: authorId,
          name: authorName,
          bio: authorBio,
          imageUrl: authorPhoto,
          meta: authorMeta,
          worksForId: ids.organization,
          url: authorPath ? `${siteUrl}${authorPath}` : undefined,
        })]
      : []),
    buildArticleEntity({
      id: ids.article,
      type: post.schema_type || 'BlogPosting',
      url: postUrl,
      headline: post.title,
      description: post.excerpt || '',
      datePublished: post.published_at!,
      dateModified: post.updated_at,
      authorId,
      publisherId: ids.organization,
      mainEntityOfPageId: ids.webPage,
      imageId: post.featured_image_url ? ids.primaryImage : undefined,
      articleSection: category?.name || null,
      keywords: tags?.map((t) => t.name),
    }),
    ...(faqItems.length > 0 ? [buildFAQEntity(`${postUrl}#faq`, faqItems)] : []),
    buildBreadcrumbEntity(ids.breadcrumb, breadcrumbItems),
  ]);

  const displayTitle = plain(post.title);
  const publishedIso = post.published_at || post.created_at;
  const dateLabel = new Date(publishedIso).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const captionHtml = post.featured_image_credit ? sanitizeInlineHtml(post.featured_image_credit) : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />
      <main id="main">
        <article className="article">
          <div className="article__col">
            <nav className="article__trail" aria-label="Article category">
              <a href="/news/">News</a>
              {category && (
                <>
                  {' '}
                  <span className="article__trail-sep" aria-hidden="true">{'>'}</span>{' '}
                  <a href={`/news/category/${category.slug}/`}>{category.name}</a>
                </>
              )}
            </nav>
            <h1 className="article__headline">{displayTitle}</h1>
            <hr className="article__rule" />
            <div className="article__meta">
              <p><time dateTime={publishedIso.slice(0, 10)}>{dateLabel}</time></p>
            </div>
            {post.featured_image_url && (
              <figure className="article__figure">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.featured_image_url} alt={post.featured_image_alt || displayTitle} width={1200} height={675} loading="eager" decoding="async" />
                {captionHtml && (
                  <figcaption><span className="article__caption" dangerouslySetInnerHTML={{ __html: captionHtml }} /></figcaption>
                )}
              </figure>
            )}

            {siteSettings?.post_html_block_enabled && siteSettings.post_html_block_content && (
              <div dangerouslySetInnerHTML={{ __html: sanitizePostHtml(siteSettings.post_html_block_content) }} />
            )}

            {post.content && <div className="blog-prose" dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.content) }} />}

            {post.media_url && (
              <div className="blog-media">
                {post.media_type === 'video' && <video src={post.media_url} controls style={{ width: '100%' }} />}
                {post.media_type === 'audio' && <audio src={post.media_url} controls style={{ width: '100%' }} />}
                {post.media_type === 'image' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.media_url} alt={post.media_caption || 'Media attachment'} style={{ width: '100%', height: 'auto' }} />
                )}
                {post.media_caption && <p>{post.media_caption}</p>}
                {post.media_credit && <p>Credit: {post.media_credit}</p>}
              </div>
            )}

            {tags && tags.length > 0 && (
              <ul className="article__tags" aria-label="Tags">
                {tags.map((tag) => (
                  <li key={tag.slug}><a href={`/news/tag/${tag.slug}/`}>{tag.name}</a></li>
                ))}
              </ul>
            )}
          </div>
        </article>
        <ContactPanel />
      </main>
    </>
  );
}
