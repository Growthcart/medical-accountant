import Hero from '@/components/Hero';
import { WhoWeHelp, Testimonial, Team, LatestNews, ContactPanel } from '@/components/Sections';
import JsonLd from '@/components/JsonLd';
import { content, pageMeta } from '@/lib/site';

// The latest-news section reads the CMS, so the home page is rendered per request.
export const dynamic = 'force-dynamic';

export const metadata = pageMeta('index', '/');

export default function Home() {
  return (
    <main id="main">
      <JsonLd path="/" name={content.pages.index.seoTitle} description={content.pages.index.description} kind="home" />
      <Hero
        title="Specialist Medical Accountants"
        lead={[
          'Medical Accountants and Tax specialists who can help keep your personal and practice tax bills to a minimum.',
          'We are experienced at working with GPs, Hospital consultants, Dentists, Locum Doctors and can help you with business decisions which will directly affect your income.',
        ]}
      />
      <WhoWeHelp />
      <Testimonial />
      <Team />
      <ContactPanel />
      <LatestNews />
    </main>
  );
}
