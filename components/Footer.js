import { SITE, WHO, OFFICES } from '@/lib/site';
import { CookieSettingsLink } from './ConsentBanner';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-upper">
        <div className="footer__grid">
          <div>
            <a href="/" aria-label="MedicalAccountant.ie home" className="inline-flex shrink-0 items-center transition-transform hover:scale-[1.02]">
              <img src="/images/logo.png" alt="MedicalAccountant.ie" width="210" height="61" className="h-12 w-auto lg:h-[64px]" style={{ filter: 'brightness(0) invert(1)' }} />
            </a>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Our specialist team provides a wide range of accounting and business services to medical professionals like GPs, Hospital consultants, Dentists and Locum Doctors.
            </p>
            <ul className="footer__list mt-6">
              <li><a href={`tel:${SITE.tel}`} className="footer__link">{SITE.phone}</a></li>
              <li><a href={`mailto:${SITE.email}`} className="footer__link">{SITE.email}</a></li>
              {OFFICES.map((o) => (
                <li key={o.name} className="leading-relaxed">
                  <strong className="font-semibold text-white">{o.name}</strong>
                  {o.lines.map((l) => (<span key={l}><br />{l}</span>))}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Who We Help</h3>
            <div className="gold-rule !mx-0 mb-4"></div>
            <ul className="footer__list space-y-2">
              {WHO.map((w) => (<li key={w.href}><a href={w.href} className="footer__link">{w.label}</a></li>))}
              <li><a href="/ihca/" className="footer__link">IHCA</a></li>
            </ul>
          </div>
          <div>
            <h3>Other Useful Links</h3>
            <div className="gold-rule !mx-0 mb-4"></div>
            <ul className="footer__list space-y-2">
              <li><a href="/" className="footer__link">Home</a></li>
              <li><a href="/contact/" className="footer__link">Contact us</a></li>
              <li><a href="/terms/" className="footer__link">Terms &amp; Conditions</a></li>
              <li><a href="/news/" className="footer__link">Read our Blog</a></li>
            </ul>
          </div>
          <div>
            <h3>Certifications</h3>
            <div className="gold-rule !mx-0 mb-4"></div>
            <div className="flex flex-wrap items-center gap-4">
              <img src="/images/wp/acca.gif" alt="ACCA" width="64" height="64" className="h-16 w-auto rounded-md bg-white p-1" loading="lazy" />
              <img src="/images/wp/associations.png" alt="Medical accounting service Ireland" width="150" height="72" className="h-16 w-auto rounded-md bg-white p-1" loading="lazy" />
            </div>
          </div>
        </div>
      </div>
      <div className="footer-bottom-wrap">
        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} MedicalAccountant.ie. All rights reserved. <CookieSettingsLink className="footer__link underline" /></p>
        </div>
      </div>
    </footer>
  );
}
