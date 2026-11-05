import Hero from '@/components/Hero';
import JsonLd from '@/components/JsonLd';
import { content, pageMeta } from '@/lib/site';

export const metadata = pageMeta('terms', '/terms/');

export default function Terms() {
  const p = content.pages.terms;
  return (
    <main id="main">
      <JsonLd path="/terms/" name="Terms and Conditions" description={p.description} />
      <Hero eyebrow="Legal" title="Terms and Conditions" lead={[p.lead]} cta={false} />
      <section className="bg-white py-16 md:py-20">
        <div className="container-page">
          <article className="legal-page legal-content" dangerouslySetInnerHTML={{ __html: p.body }} />
        </div>
      </section>
    </main>
  );
}
