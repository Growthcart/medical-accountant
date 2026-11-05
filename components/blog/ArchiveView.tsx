import type React from 'react';
import { CardGrid } from './ArchiveCard';
import type { ArchivePageData } from '@/lib/blog/listing';
import { HEROES } from '@/lib/site';
import '@/app/css/blog-cms.css';

// Trailing slash: the site keeps its WordPress-style URLs (/news/, /news/page/2/).
export function archivePageHref(basePath: string, page: number): string {
  return `${page <= 1 ? basePath : `${basePath}/page/${page}`}/`;
}

// Page numbers to show: always the first and last, the current page and its
// neighbours, with gaps marked by null.
function pageList(current: number, total: number): Array<number | null> {
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const out: Array<number | null> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

function Pagination({ basePath, page, totalPages }: { basePath: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="blog-pager" aria-label="Pagination">
      {page > 1 && (
        <a href={archivePageHref(basePath, page - 1)} rel="prev" className="blog-pager__link">← Previous</a>
      )}
      {pageList(page, totalPages).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="blog-pager__gap">…</span>
        ) : p === page ? (
          <span key={p} aria-current="page" className="blog-pager__link blog-pager__link--current">{p}</span>
        ) : (
          <a key={p} href={archivePageHref(basePath, p)} className="blog-pager__link">{p}</a>
        ),
      )}
      {page < totalPages && (
        <a href={archivePageHref(basePath, page + 1)} rel="next" className="blog-pager__link">Next →</a>
      )}
    </nav>
  );
}

// News archive in the site's page layout: the standard banner with the heading, then the card grid and pagination.
export default function ArchiveView({
  data,
  basePath,
  heading,
  header,
  emptyText = 'No posts here yet.',
}: {
  data: ArchivePageData;
  // Archive URL without the /page/N suffix, e.g. /news/category/tax.
  basePath: string;
  // Eyebrow + H1 (+ description), shown in the banner.
  heading: React.ReactNode;
  // Optional block before the posts (e.g. the author profile card).
  header?: React.ReactNode;
  emptyText?: string;
}) {
  const { hero, grid, page, totalPages } = data;
  const posts = [...hero, ...grid];
  const { desktop, mobile } = HEROES.default;

  return (
    <main id="main">
      <section className="page-hero--image hero-banner page-hero--solid-left" aria-labelledby="page-hero-title">
        <picture>
          {mobile && <source media="(max-width: 767px)" srcSet={mobile} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={desktop} alt="" loading="eager" fetchPriority="high" decoding="async" className="hero-banner__bg" style={{ objectPosition: 'right center' }} />
        </picture>
        <div className="container-page page-hero__banner-inner">
          <div className="page-hero__banner-content fade-stagger">{heading}</div>
        </div>
      </section>
      <section className="section section--white">
        <div className="container-page">
          {header}
          {posts.length > 0 ? <CardGrid posts={posts} /> : <p className="blog-empty">{emptyText}</p>}
          <Pagination basePath={basePath} page={page} totalPages={totalPages} />
        </div>
      </section>
    </main>
  );
}
