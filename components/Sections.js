import { content, OFFICES, SITE } from '@/lib/site';
import EnquiryForm from './EnquiryForm';
import PostCard from './PostCard';
import { latestPosts } from '@/lib/latest';

const Q = { 'data-astro-cid-ta2fbyqs': '' }; // scoped quote/advisor styles in about.css key off this attribute
const DELAY = ['reveal--d1', 'reveal--d2', 'reveal--d3'];

const Arrow = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

const CARDS = [
  { href: '/gp-accountants/', img: 'GP-Accountants.webp', title: 'General Practitioners', desc: 'We are experienced at working with GPs and can help you with business decisions which will directly affect your income.' },
  { href: '/hospital-consultants/', img: 'hospital-accounting-services.webp', title: 'Hospital Consultants', desc: 'As specialist medical accountants we work closely with consultants to provide effective solutions to their specific accountancy and financial needs.' },
  { href: '/locum-accountants/', img: 'locum-accountants.webp', title: 'Locum Doctors', desc: 'We have extensive experience of providing specialist accountancy and tax services to Locums including HES pension advice. Due to our niche expertise we act for Locums throughout Ireland.' },
  { href: '/dental-accountants/', img: 'accountants-for-dentist.webp', title: 'Dental Professionals', desc: 'We have a dedicated team of dental accountants with years of experience in dealing with dental professionals.' },
];

export function WhoWeHelp() {
  return (
    <section className="section section--off" aria-labelledby="who-heading">
      <div className="container-page">
        <div className="reveal mb-14">
          <span className="eyebrow">Who We Help</span>
          <h2 id="who-heading">Specialist accountants for medical professionals</h2>
          <div className="rule"></div>
        </div>
        <div className="services-grid">
          {CARDS.map((c, i) => (
            <article key={c.href} className={`service-card group reveal ${DELAY[i % 3]}`}>
              <img src={`/images/wp/${c.img}`} alt={c.title} width="400" height="300" loading="lazy" decoding="async" className="service-card__photo" />
              <h3>{c.title}</h3>
              <p className="service-card__desc">{c.desc}</p>
              <a href={c.href} className="service-card__cta">
                Know More<span className="sr-only"> about {c.title}</span> <Arrow />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonial() {
  const t = content.testimonial;
  return (
    <section className="section section--dark !py-20" aria-label="What clients say about us" {...Q}>
      <div className="section-pattern opacity-50" aria-hidden="true" {...Q}></div>
      <div className="glow glow--tr" aria-hidden="true" {...Q}></div>
      <div className="container-page relative" {...Q}>
        <div className="quote reveal mx-auto max-w-3xl text-center" {...Q}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#38bdf8" className="quote__mark" aria-hidden="true" {...Q}>
            <path d="M9 7H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v1a3 3 0 0 1-3 3v2a5 5 0 0 0 5-5V9a2 2 0 0 0 0-2zM19 7h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v1a3 3 0 0 1-3 3v2a5 5 0 0 0 5-5V9a2 2 0 0 0 0-2z" />
          </svg>
          <span className="eyebrow" {...Q}>What clients say about us</span>
          <p className="mt-4 text-white/70">{t.intro}</p>
          <p className="quote__text" style={{ fontSize: '1.25rem', lineHeight: 1.6 }} {...Q}>{t.quote}</p>
          <div className="rule mx-auto" {...Q}></div>
        </div>
      </div>
    </section>
  );
}

export function Team() {
  return (
    <section className="section section--off !py-20" aria-label="Our people" {...Q}>
      <div className="container-page" {...Q}>
        <div className="reveal mb-12 max-w-3xl" {...Q}>
          <span className="eyebrow" {...Q}>Our team</span>
          <h2 {...Q}>Meet our people</h2>
          <div className="rule" {...Q}></div>
          <p className="mt-4 leading-relaxed text-navy/75">It is our people who make us what we are today and our team’s commitment to our clients is evident in everything we do. Our team has great technical expertise but we also possess the ability to explain even the most complex of issues in a practical way.</p>
          <p className="mt-4 leading-relaxed text-navy/75">For any business related matters, tax advice or financial planning, you can directly get in touch with a member of our team.</p>
        </div>
        <div className="advisors" {...Q}>
          {content.team.map((m, i) => (
            <article key={m.name + i} className={`advisor reveal ${DELAY[i % 2]}`} {...Q}>
              <img className="advisor__photo" src={m.img} alt={m.name} width="400" height="500" loading="lazy" decoding="async" {...Q} />
              <div className="advisor__body" {...Q}>
                <h3 className="advisor__name" {...Q}>{m.name}</h3>
                <p className="advisor__role" {...Q}>{m.role}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function LatestNews({ limit = 6 }) {
  const posts = await latestPosts(limit);
  return (
    <section className="section section--white latest-posts" aria-labelledby="latest-posts-title">
      <div className="container-page">
        <div className="latest-posts__head reveal">
          <div>
            <span className="eyebrow">News</span>
            <h2 id="latest-posts-title">Latest News &amp; Updates</h2>
          </div>
          <a href="/news/" className="latest-posts__all">View all articles <span aria-hidden="true">→</span></a>
        </div>
        <ul className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (<PostCard key={p.slug} post={p} delay={DELAY[i % 3]} />))}
        </ul>
      </div>
    </section>
  );
}

export function Offices() {
  return (
    <div className="office-card">
      {OFFICES.map((o) => (
        <div key={o.name} className="office">
          <h3>{o.name}:</h3>
          <p>{o.lines.map((l, i) => (<span key={l}>{l}{i < o.lines.length - 1 && <br />}</span>))}</p>
          {o.name.startsWith('Dublin') && <p>Call: <a href={`tel:${SITE.tel}`}>{SITE.phone}</a></p>}
          <p>Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
        </div>
      ))}
    </div>
  );
}

export function ContactPanel({ variant = 'enquiry', heading = 'Whether you are looking for a new medical accountant or to change your current one, we are here to help:' }) {
  return (
    <section className="section contact-booking" id="consultation" aria-label="Send us an enquiry">
      <div className="container-page">
        <div className="contact-panel reveal">
          <h2 className="contact-panel__title">{heading}</h2>
          <div className="contact-row">
            <div className="contact-row__form">
              <EnquiryForm variant={variant} />
            </div>
            <div className="contact-row__booking">
              <Offices />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Content block rendered as the original's rich text, with an optional image column.
export function ServiceBody({ page }) {
  const html = page.blocks.map((b) => (b.t === 'ul' ? `<ul>${b.items.map((i) => `<li>${i}</li>`).join('')}</ul>` : `<${b.t}>${b.html}</${b.t}>`)).join('');
  const imgs = page.images;
  return (
    <section className="section section--white" aria-label={page.h1}>
      <div className="container-page">
        <div className={imgs.length ? 'grid items-start gap-10 lg:grid-cols-2 lg:gap-16' : ''}>
          <div className="blog-prose reveal" style={{ marginTop: 0 }} dangerouslySetInnerHTML={{ __html: html }} />
          {imgs.length > 0 && (
            <div className="reveal reveal--right space-y-6">
              {imgs.map((im) => (<img key={im.src} src={im.src} alt={im.alt || page.h1} loading="lazy" decoding="async" className="w-full rounded-2xl shadow-card" />))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

