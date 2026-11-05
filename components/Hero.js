import { HEROES } from '@/lib/site';

// The original banners have the teal gradient baked into the photo, so no overlay is rendered.
export default function Hero({ hero = 'default', eyebrow, title, lead = [], cta = true }) {
  const { desktop, mobile } = HEROES[hero] || HEROES.default;
  return (
    <section className="page-hero--image hero-banner page-hero--solid-left" aria-labelledby="page-hero-title">
      <link rel="preload" as="image" href={desktop} media={mobile ? '(min-width: 768px)' : undefined} fetchPriority="high" />
      {mobile && <link rel="preload" as="image" href={mobile} media="(max-width: 767px)" fetchPriority="high" />}
      <picture>
        {mobile && <source media="(max-width: 767px)" srcSet={mobile} />}
        <img src={desktop} alt="" loading="eager" fetchPriority="high" decoding="async" width="1400" height="550" className="hero-banner__bg" style={{ objectPosition: 'right center' }} />
      </picture>
      <div className="container-page page-hero__banner-inner">
        <div className="page-hero__banner-content fade-stagger">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1 id="page-hero-title">{title}</h1>
          {lead.map((l) => (<p key={l} className="hero-banner__subtitle">{l}</p>))}
          {cta && (
            <div className="hero-banner__actions">
              <a href="/contact/#consultation" className="btn-gold hero-cta">Contact us for a consultation</a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
