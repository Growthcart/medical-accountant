import type React from 'react';
import Link from 'next/link';
import AuthorAvatar from './AuthorAvatar';
import SiteImage from './SiteImage';
import { BLOG_ACCENT, plain, shorten, timeAgo } from '@/lib/blog/format';
import { postHref, type ArchivePost } from '@/lib/blog/listing';

interface HeroPostsBannerProps {
  posts: ArchivePost[];
  // Rendered under the top stories (the featured strip).
  middle?: React.ReactNode;
  // Heading shown above the stories (the page H1).
  heading?: React.ReactNode;
}

// Side-story descriptions are capped at this many characters, spaces and the
// trailing ellipsis included.
const SIDE_EXCERPT_MAX = 75;

function Meta({ post }: { post: ArchivePost }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px]">
      {post.category && (
        <>
          <Link href={`/news/category/${post.category.slug}`} className="font-semibold hover:underline" style={{ color: BLOG_ACCENT }}>
            {post.category.name}
          </Link>
          <span className="h-3.5 w-px bg-gray-300" aria-hidden="true" />
        </>
      )}
      <span className="text-gray-500">{post.reading_minutes} min read</span>
    </div>
  );
}

// Archive hero: the newest article as a large lead story on the left, and the
// next three as compact stories with thumbnails on the right.
export default function HeroPostsBanner({ posts, middle, heading }: HeroPostsBannerProps) {
  if (posts.length === 0) return null;

  const [lead, ...rest] = posts;
  const side = rest.slice(0, 3);
  const author = lead.author;
  const authorName = author?.name || 'MedicalAccountant.ie';

  return (
    <section className="w-full bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 md:pb-14 md:pt-8 lg:px-8">
        {heading && <div className="mb-5 md:mb-6">{heading}</div>}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Lead story: full-height image with author, headline and meta
              overlaid on a dark gradient. */}
          <article className={side.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}>
            <div className="group relative h-full min-h-[360px] overflow-hidden rounded-lg bg-gray-900 sm:min-h-[440px] lg:min-h-[400px]">
              {lead.featured_image_url && (
                <SiteImage
                  src={lead.featured_image_url}
                  alt={lead.featured_image_alt || plain(lead.title)}
                  fill
                  priority
                  sizes="(min-width: 1280px) 720px, (min-width: 1024px) 58vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" aria-hidden="true" />
              {/* Whole card links to the article; the author and category links sit above it. */}
              <Link href={postHref(lead)} className="absolute inset-0 z-10" aria-label={plain(lead.title)} />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-5 md:p-7">
                <div className="mb-3 flex items-center gap-2.5">
                  <AuthorAvatar src={author?.photo} name={authorName} size={32} className="rounded" fallbackClassName="bg-white/20 text-white" />
                  <div className="leading-tight">
                    {author?.segment ? (
                      <Link
                        href={`/news/author/${encodeURIComponent(author.segment)}`}
                        className="pointer-events-auto block text-sm font-semibold text-white hover:underline"
                      >
                        {authorName}
                      </Link>
                    ) : (
                      <span className="block text-sm font-semibold text-white">{authorName}</span>
                    )}
                    <span className="block text-xs text-white/70">Author</span>
                  </div>
                </div>

                <h2 className="mb-3 line-clamp-3 text-[20px] font-bold leading-[1.25] text-white md:text-[24px] lg:text-[26px]">
                  {plain(lead.title)}
                </h2>

                <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-white/80">
                  {lead.category && (
                    <>
                      <Link
                        href={`/news/category/${lead.category.slug}`}
                        className="pointer-events-auto font-semibold text-white hover:underline"
                      >
                        {lead.category.name}
                      </Link>
                      <span className="h-3.5 w-px bg-white/40" aria-hidden="true" />
                    </>
                  )}
                  <span>{timeAgo(lead.published_at)}</span>
                  <span className="h-3.5 w-px bg-white/40" aria-hidden="true" />
                  <span>{lead.reading_minutes} minute read</span>
                </div>
              </div>
            </div>
          </article>

          {/* Three side stories */}
          {side.length > 0 && (
            <div className="flex flex-col gap-6 lg:col-span-5 lg:gap-8">
              {side.map((post) => {
                const excerpt = shorten(plain(post.excerpt), SIDE_EXCERPT_MAX);
                return (
                  <article key={post.id} className="flex items-start gap-4 md:gap-5">
                    <div className="min-w-0 flex-1">
                      <h2 className="mb-2 line-clamp-2 text-[15px] font-bold leading-snug text-gray-900 md:text-[17px]">
                        <Link href={postHref(post)} className="transition-colors hover:text-gray-700">
                          {plain(post.title)}
                        </Link>
                      </h2>
                      {excerpt && (
                        <div className="mb-2.5 hidden sm:block">
                          <p className="line-clamp-2 text-sm leading-relaxed text-gray-500">{excerpt}</p>
                        </div>
                      )}
                      <Meta post={post} />
                    </div>
                    {post.featured_image_url && (
                      <Link href={postHref(post)} className="block w-28 shrink-0 overflow-hidden rounded bg-gray-100 sm:w-40 lg:w-44">
                        <SiteImage
                          src={post.featured_image_url}
                          alt={post.featured_image_alt || plain(post.title)}
                          width={352}
                          height={235}
                          sizes="(min-width: 1024px) 176px, (min-width: 640px) 160px, 112px"
                          className="aspect-[3/2] w-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {middle && <div className="mt-10 lg:mt-12">{middle}</div>}
      </div>
    </section>
  );
}
