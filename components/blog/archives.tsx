import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import ArchiveView, { archivePageHref } from './ArchiveView';
import { content } from '@/lib/site';
import AuthorAvatar from './AuthorAvatar';
import { createServiceClient } from '@/lib/db/server';
import { getSiteUrl } from '@/lib/getSiteUrl';
import { isBrandAuthor, resolveAuthorMeta } from '@/lib/authors';
import { clipDescription } from '@/lib/blog/format';
import { buildIds, buildPersonEntity, jsonLdScript } from '@/lib/schemaBuilder';
import { buildArchiveGraph, getBusinessInfo } from '@/lib/blog/archiveSchema';
import {
  authorSegment,
  getArchivePage,
  getAuthorBySegment,
  type ArchiveFilter,
  type ArchivePageData,
  type AuthorProfile,
} from '@/lib/blog/listing';

// Server-side building blocks for the blog archive routes: the blog index,
// category, tag and author archives, each with /page/N pagination. The route
// files only parse params and call these.

const NOT_FOUND_METADATA: Metadata = { title: 'Not Found', robots: { index: false, follow: true } };

// "2" -> 2; anything that is not a positive whole number -> null.
export function parsePage(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 ? n : null;
}

interface Term {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const getCategory = cache(async (slug: string): Promise<Term | null> => {
  const { data } = await createServiceClient()
    .from('categories')
    .select('id, name, slug, description')
    .eq('slug', slug)
    .maybeSingle();
  return (data as Term | null) ?? null;
});

const getTag = cache(async (slug: string): Promise<Term | null> => {
  const { data } = await createServiceClient()
    .from('tags')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle();
  return data ? { ...(data as Omit<Term, 'description'>), description: null } : null;
});

function pageTitle(base: string, page: number): string {
  return page > 1 ? `${base} · Page ${page}` : base;
}

// Later pages get their own description so /page/2 does not repeat page 1's.
function pageDescription(base: string, page: number): string {
  return page > 1 ? `Page ${page}: ${base}` : base;
}

function archiveMetadata(input: {
  siteUrl: string;
  basePath: string;
  page: number;
  title: string;
  description: string;
  ogType?: 'website' | 'profile';
}): Metadata {
  const url = `${input.siteUrl}${archivePageHref(input.basePath, input.page)}`;
  const title = pageTitle(input.title, input.page);
  const description = pageDescription(input.description, input.page);
  const pages = (content as { pages: Record<string, { seoTitle: string; description: string }> }).pages;
  const isIndex = input.basePath === '/news' && input.page === 1;
  return {
    title: { absolute: isIndex ? pages.news.seoTitle : `${title} | MedicalAccountant.ie` },
    description: isIndex ? pages.news.description : description,
    alternates: {
      canonical: url,
      ...(input.page === 1 && { types: { 'text/markdown': url } }),
    },
    openGraph: {
      type: input.ogType || 'website',
      url,
      title,
      description,
      siteName: 'MedicalAccountant.ie',
      locale: 'en_IE',
    },
  };
}

// Banner text in the site's own page style: "News" as the eyebrow, then the title and description.
function Heading({ title, description }: {
  crumbs?: { name: string; href?: string }[];
  title: string;
  description?: string | null;
}) {
  return (
    <>
      <span className="eyebrow">News</span>
      <h1 id="page-hero-title">{title}</h1>
      {description && <p className="hero-banner__subtitle">{description}</p>}
    </>
  );
}

// Shared page body: JSON-LD graph plus the archive layout.
async function renderArchive(input: {
  filter: ArchiveFilter;
  page: number;
  basePath: string;
  name: string;
  description?: string | null;
  crumbs: { name: string; path: string }[];
  heading: React.ReactNode;
  header?: React.ReactNode;
  heroCount?: number;
  withFeatured?: boolean;
  emptyText?: string;
  schema?: { pageType: 'ProfilePage'; person: Record<string, unknown>; personId: string };
}) {
  const data: ArchivePageData = await getArchivePage(input.filter, input.page, {
    heroCount: input.heroCount,
    withFeatured: input.withFeatured,
  });
  if (input.page > data.totalPages) notFound();

  const siteUrl = await getSiteUrl();
  const business = await getBusinessInfo();
  const pageUrl = `${siteUrl}${archivePageHref(input.basePath, input.page)}`;
  const graph = buildArchiveGraph({
    siteUrl,
    pageUrl,
    name: pageTitle(input.name, input.page),
    description: input.description ? pageDescription(input.description, input.page) : input.description,
    business,
    breadcrumbs: [
      ...input.crumbs.map((c) => ({ name: c.name, url: `${siteUrl}${c.path}` })),
      ...(input.page > 1 ? [{ name: `Page ${input.page}`, url: pageUrl }] : []),
    ],
    posts: [...data.hero, ...data.grid],
    pageType: input.schema?.pageType,
    extra: input.schema ? [input.schema.person] : undefined,
    mainEntityId: input.schema?.personId,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />
      <ArchiveView
        data={data}
        basePath={input.basePath}
        heading={input.heading}
        header={input.header}
        emptyText={input.emptyText}
      />
    </>
  );
}

function redirectFirstPage(page: number, basePath: string): void {
  if (page === 1) permanentRedirect(basePath);
}

// ---- Blog index (/news) ----

const BLOG_DESCRIPTION =
  'Latest news and updates from MedicalAccountant.ie: tax, accounting and practice news for doctors and dentists in Ireland.';

export async function blogArchiveMetadata(page: number): Promise<Metadata> {
  const siteUrl = await getSiteUrl();
  if (page > 1) {
    const { totalPages } = await getArchivePage({ kind: 'all' }, page, { withFeatured: true });
    if (page > totalPages) return NOT_FOUND_METADATA;
  }
  return archiveMetadata({ siteUrl, basePath: '/news', page, title: 'News', description: BLOG_DESCRIPTION });
}

export async function BlogArchive({ page, fromPagedRoute = false }: { page: number; fromPagedRoute?: boolean }) {
  if (fromPagedRoute) redirectFirstPage(page, '/news');
  return renderArchive({
    filter: { kind: 'all' },
    page,
    basePath: '/news',
    name: 'Latest posts',
    description: BLOG_DESCRIPTION,
    crumbs: [{ name: 'Home', path: '' }, { name: 'News', path: '/news' }],
    heading: (
      <Heading
        crumbs={[{ name: 'Home', href: '/' }, { name: 'News' }]}
        title={pageTitle('Latest News / Updates', page)}
      />
    ),
    withFeatured: true,
    emptyText: 'No posts yet. Check back soon.',
  });
}

// ---- Category archive (/news/category/{slug}) ----

export async function categoryArchiveMetadata(slug: string, page: number): Promise<Metadata> {
  const category = await getCategory(slug);
  if (!category) return NOT_FOUND_METADATA;
  if (page > 1) {
    const { totalPages } = await getArchivePage({ kind: 'category', id: category.id }, page, { withFeatured: true });
    if (page > totalPages) return NOT_FOUND_METADATA;
  }
  return archiveMetadata({
    siteUrl: await getSiteUrl(),
    basePath: `/news/category/${category.slug}`,
    page,
    title: `${category.name}: Articles`,
    description:
      category.description ||
      `${category.name} from the MedicalAccountant.ie blog: latest articles.`,
  });
}

export async function CategoryArchive({ slug, page, fromPagedRoute = false }: { slug: string; page: number; fromPagedRoute?: boolean }) {
  const category = await getCategory(slug);
  if (!category) notFound();
  const basePath = `/news/category/${category.slug}`;
  if (fromPagedRoute) redirectFirstPage(page, basePath);
  return renderArchive({
    filter: { kind: 'category', id: category.id },
    page,
    basePath,
    name: category.name,
    description: category.description || `Posts in ${category.name}`,
    crumbs: [{ name: 'Home', path: '' }, { name: 'News', path: '/news' }, { name: category.name, path: basePath }],
    heading: (
      <Heading
        crumbs={[{ name: 'Home', href: '/' }, { name: 'News', href: '/news' }, { name: category.name }]}
        title={page > 1 ? `${category.name} · Page ${page}` : `Latest posts from ${category.name}`}
        description={page === 1 ? category.description : null}
      />
    ),
    withFeatured: true,
    emptyText: 'No posts in this category yet.',
  });
}

// ---- Tag archive (/news/tag/{slug}) ----

export async function tagArchiveMetadata(slug: string, page: number): Promise<Metadata> {
  const tag = await getTag(slug);
  if (!tag) return NOT_FOUND_METADATA;
  if (page > 1) {
    const { totalPages } = await getArchivePage({ kind: 'tag', id: tag.id }, page);
    if (page > totalPages) return NOT_FOUND_METADATA;
  }
  return archiveMetadata({
    siteUrl: await getSiteUrl(),
    basePath: `/news/tag/${tag.slug}`,
    page,
    title: `Tag: ${tag.name}`,
    description: `Posts tagged with ${tag.name}`,
  });
}

export async function TagArchive({ slug, page, fromPagedRoute = false }: { slug: string; page: number; fromPagedRoute?: boolean }) {
  const tag = await getTag(slug);
  if (!tag) notFound();
  const basePath = `/news/tag/${tag.slug}`;
  if (fromPagedRoute) redirectFirstPage(page, basePath);
  const { total } = await getArchivePage({ kind: 'tag', id: tag.id }, page);
  return renderArchive({
    filter: { kind: 'tag', id: tag.id },
    page,
    basePath,
    name: `Tag: ${tag.name}`,
    description: `Posts tagged with ${tag.name}`,
    crumbs: [{ name: 'Home', path: '' }, { name: 'News', path: '/news' }, { name: tag.name, path: basePath }],
    heading: (
      <Heading
        crumbs={[{ name: 'Home', href: '/' }, { name: 'News', href: '/news' }, { name: `Tag: ${tag.name}` }]}
        title={pageTitle(`#${tag.name}`, page)}
        description={`${total} ${total === 1 ? 'article' : 'articles'} tagged with ${tag.name}`}
      />
    ),
    emptyText: 'No posts with this tag yet.',
  });
}

// ---- Author archive (/news/author/{username}) ----

function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function withUtm(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}utm_source=medicalaccountant.ie`;
}

function authorName(profile: AuthorProfile): string {
  return profile.full_name || profile.username || 'MedicalAccountant.ie author';
}

function AuthorProfileCard({ profile }: { profile: AuthorProfile }) {
  const name = authorName(profile);
  const meta = resolveAuthorMeta(profile);
  const linkedin = safeHttpUrl(profile.linkedin_url || meta.sameAs?.find((u) => u.includes('linkedin.com')));
  const website = safeHttpUrl(profile.website_url);
  const bio = profile.bio || meta.description;

  return (
    <>
      <div className="blog-author-card">
        {profile.profile_photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.profile_photo_url} alt={name} width={96} height={96} className="blog-author-card__photo" />
        )}
        <div>
          <p className="blog-author-card__role">{meta.jobTitle || 'Author, MedicalAccountant.ie'}</p>
          {bio && <p className="blog-author-card__bio">{bio}</p>}
          {(linkedin || website) && (
            <div className="blog-author-card__links">
              {linkedin && <a href={withUtm(linkedin)} target="_blank" rel="nofollow noopener noreferrer">LinkedIn</a>}
              {website && <a href={withUtm(website)} target="_blank" rel="nofollow noopener noreferrer">Website</a>}
            </div>
          )}
        </div>
      </div>
      <h2 className="blog-archive-title">Posts by {name}</h2>
    </>
  );
}

export async function authorArchiveMetadata(segment: string, page: number): Promise<Metadata> {
  const profile = await getAuthorBySegment(segment);
  if (!profile) return NOT_FOUND_METADATA;
  if (page > 1) {
    const { totalPages } = await getArchivePage({ kind: 'author', id: profile.id }, page, { heroCount: 0 });
    if (page > totalPages) return NOT_FOUND_METADATA;
  }
  const name = authorName(profile);
  const meta = resolveAuthorMeta(profile);
  const description = clipDescription(profile.bio || meta.description || `Articles by ${name} on the MedicalAccountant.ie blog.`);
  return archiveMetadata({
    siteUrl: await getSiteUrl(),
    basePath: `/news/author/${encodeURIComponent(authorSegment(profile) || segment)}`,
    page,
    title: `${name}: Articles & Profile`,
    description,
    ogType: 'profile',
  });
}

export async function AuthorArchive({ segment, page, fromPagedRoute = false }: { segment: string; page: number; fromPagedRoute?: boolean }) {
  const profile = await getAuthorBySegment(segment);
  if (!profile) notFound();
  const name = authorName(profile);
  const basePath = `/news/author/${encodeURIComponent(authorSegment(profile) || segment)}`;
  if (fromPagedRoute) redirectFirstPage(page, basePath);

  const siteUrl = await getSiteUrl();
  const ids = buildIds(siteUrl, `${siteUrl}${basePath}`);
  const meta = resolveAuthorMeta(profile);
  const personId = ids.person(name);
  // The company account's archive is a plain collection page: the brand is
  // already the site Organization, so no Person entity is emitted for it.
  const brandAuthor = isBrandAuthor(name, (await getBusinessInfo())?.business_name);

  return renderArchive({
    filter: { kind: 'author', id: profile.id },
    page,
    basePath,
    name,
    description: profile.bio || meta.description || `Articles by ${name}`,
    crumbs: [{ name: 'Home', path: '' }, { name: 'News', path: '/news' }, { name, path: basePath }],
    heading: (
      <Heading crumbs={[{ name: 'Home', href: '/' }, { name: 'News', href: '/news' }, { name }]} title={pageTitle(name, page)} />
    ),
    header: page === 1 ? <AuthorProfileCard profile={profile} /> : undefined,
    heroCount: 0,
    emptyText: 'No published posts yet.',
    schema: brandAuthor ? undefined : {
      pageType: 'ProfilePage',
      personId,
      person: buildPersonEntity({
        id: personId,
        name,
        bio: profile.bio,
        imageUrl: profile.profile_photo_url,
        meta,
        worksForId: ids.organization,
        url: `${siteUrl}${basePath}`,
      }),
    },
  });
}
