import '@/app/css/blog-cms.css';

export const metadata = { title: 'Page not found', robots: { index: false, follow: true } };

// 404 inside the site (header and footer come from the layout).
export default function NotFound() {
  return (
    <main id="main">
      <section className="section section--white">
        <div className="container-page" style={{ textAlign: 'center', padding: '5rem 0' }}>
          <span className="eyebrow">404</span>
          <h1>We could not find that page</h1>
          <p className="blog-empty">The page may have moved or no longer exists.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/" className="btn-gold">Go to the home page</a>
            <a href="/blog" className="btn-outline">Read the blog</a>
          </div>
        </div>
      </section>
    </main>
  );
}
