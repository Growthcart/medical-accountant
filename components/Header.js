import { SITE, WHO } from '@/lib/site';

const Chevron = ({ className = 'h-4 w-4 transition-transform', ...p }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true" {...p}>
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
  </svg>
);

const DROPDOWN = WHO.filter((w) => w.href !== '/company-formation/');

export default function Header() {
  return (
    <header className="navbar navbar--idle nav-fade" id="nav-header" data-nav="">
      <div className="navbar__inner">
        <a href="/" aria-label="MedicalAccountant.ie home" className="inline-flex shrink-0 items-center transition-transform hover:scale-[1.02]">
          <img src="/images/logo.png" alt="MedicalAccountant.ie" width="210" height="61" className="h-12 w-auto lg:h-[64px]" />
        </a>
        <nav aria-label="Primary" className="navbar__nav">
          <a href="/" className="nav-link">Home</a>
          <div className="dropdown relative" data-dropdown="">
            <button type="button" className="nav-trigger" aria-haspopup="menu" aria-expanded="false" data-dropdown-toggle="">
              Who We Help <Chevron data-dropdown-chevron="" />
            </button>
            <div role="menu" className="dropdown-menu" data-dropdown-menu="" hidden>
              {DROPDOWN.map((w) => (
                <a key={w.href} href={w.href} role="menuitem" className="dropdown-item">
                  <span className="dropdown-item__title">{w.label}</span>
                </a>
              ))}
            </div>
          </div>
          <a href="/company-formation/" className="nav-link">Company Formation</a>
          <a href="/ihca/" className="nav-link">IHCA</a>
        </nav>
        <a href={`tel:${SITE.tel}`} className="navbar__phone hidden lg:inline-flex" aria-label={`Call ${SITE.phone}`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
          {SITE.phone}
        </a>
        <a href="/contact/" className="navbar__cta hidden lg:inline-flex" aria-label="Get in Touch">Get in Touch</a>
        <button type="button" aria-label="Toggle menu" aria-expanded="false" className="menu-toggle" data-menu-toggle="">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6" aria-hidden="true" data-menu-icon="closed"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6" aria-hidden="true" hidden data-menu-icon="open"><path d="M6 6l12 12M6 18L18 6" /></svg>
        </button>
      </div>
      <div className="mobile-menu" data-mobile-menu="" hidden>
        <nav aria-label="Mobile" className="mobile-menu__nav">
          <a href="/" className="mobile-link" data-mobile-link="">Home</a>
          <details className="mobile-acc" name="mobile-nav">
            <summary className="mobile-acc__summary"><span>Who We Help</span><Chevron className="mobile-acc__chev" /></summary>
            <div className="mobile-acc__panel">
              {DROPDOWN.map((w) => (
                <a key={w.href} href={w.href} className="mobile-sublink" data-mobile-link="">{w.label}</a>
              ))}
            </div>
          </details>
          <a href="/company-formation/" className="mobile-link" data-mobile-link="">Company Formation</a>
          <a href="/ihca/" className="mobile-link" data-mobile-link="">IHCA</a>
          <a href={`tel:${SITE.tel}`} className="mobile-link" data-mobile-link="">{SITE.phone}</a>
          <a href="/contact/" className="navbar__cta mt-3" data-mobile-link="">Get in Touch</a>
        </nav>
      </div>
    </header>
  );
}
