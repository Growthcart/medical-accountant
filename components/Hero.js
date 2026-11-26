import { HEROES } from '@/lib/site';

// The banner photos are already teal on the left; the overlay blends the picture into the solid teal text panel.
// Decorative glass cards beside the text (desktop only, hidden from screen readers).
const Tick = ({ size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);

function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="float-card float-card--chart fade-up anim-delay-300">
        <div className="bob">
          <div className="fc-row"><p className="fc-label">Tax Efficiency</p><span className="fc-chip">Improving</span></div>
          <svg viewBox="0 0 280 110" className="fc-chart">
            <defs>
              <linearGradient id="hero-grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#0db1ba" stopOpacity="0.35" />
                <stop offset="1" stopColor="#0db1ba" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 85 L40 78 L80 70 L120 55 L160 48 L200 30 L240 22 L280 10 L280 110 L0 110 Z" fill="url(#hero-grad)" />
            <path className="chart-line" d="M0 85 L40 78 L80 70 L120 55 L160 48 L200 30 L240 22 L280 10" fill="none" stroke="#0a1f44" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle className="chart-dot" cx="280" cy="10" r="4" fill="#0db1ba" />
          </svg>
          <div className="fc-axis"><span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Now</span></div>
        </div>
      </div>
      <div className="float-card float-card--badge fade-up anim-delay-500">
        <div className="bob bob--slow fc-badge">
          <span className="fc-icon"><Tick /></span>
          <div><p className="fc-label fc-label--sm">Your accounts</p><p className="fc-title">Up to date</p></div>
        </div>
      </div>
      <div className="float-card float-card--stat fade-up anim-delay-700">
        <div className="bob bob--mid">
          <p className="fc-label fc-label--sm">Tax return</p>
          <div className="fc-stat"><span className="fc-value">Filed on time</span><span className="fc-up"><Tick size={12} /></span></div>
          <div className="fc-bar"><div /></div>
        </div>
      </div>
    </div>
  );
}

export default function Hero({ hero = 'default', eyebrow, title, lead = [], cta = true, visual = false }) {
  const { desktop, mobile, crop, cropSm, fadeSm, c, h, anchorLeft } = HEROES[hero] || HEROES.default;
  return (
    <section className="hero-banner" aria-labelledby="page-hero-title">
      <link rel="preload" as="image" href={desktop} media={mobile ? '(min-width: 768px)' : undefined} fetchPriority="high" />
      {mobile && <link rel="preload" as="image" href={mobile} media="(max-width: 767px)" fetchPriority="high" />}
      {/* On desktop this box is the cropped photo, anchored bottom-right. h = its height (default: the whole banner), c = the picture's height in 550-based units (taller when its background is extended upward). */}
      <div className={anchorLeft ? 'hero-banner__photo hero-banner__photo--left' : 'hero-banner__photo'} style={crop ? { '--hero-x0': crop, '--hero-x0-sm': cropSm, '--hero-fade-sm': fadeSm, '--hero-c': c, '--hero-h': h } : undefined}>
        <picture>
          {mobile && <source media="(max-width: 767px)" srcSet={mobile} />}
          <img src={desktop} alt="" loading="eager" fetchPriority="high" decoding="async" width="2000" height="786" className="hero-banner__bg" />
        </picture>
      </div>
      {visual && <HeroVisual />}
      <div className="hero-banner__overlay" aria-hidden="true" />
      <div className="container-page">
        <div className="hero-banner__layout">
          <div className="hero-banner__content fade-stagger">
            {eyebrow && <span className="hero__badge"><span className="hero__badge-dot" />{eyebrow}</span>}
            <h1 id="page-hero-title">{title}</h1>
            {lead.map((l) => (<p key={l} className="hero-banner__subtitle">{l}</p>))}
            {cta && (
              <div className="hero-banner__actions">
                <a href="/contact/" className="btn-gold">Talk to Our Team</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
