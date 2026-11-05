import Hero from '@/components/Hero';
import { Testimonial, Team, ContactPanel } from '@/components/Sections';
import JsonLd from '@/components/JsonLd';
import { content, pageMeta } from '@/lib/site';

export const metadata = pageMeta('contact', '/contact/');

export default function Contact() {
  return (
    <main id="main">
      <JsonLd path="/contact/" name="Contact Us" description={content.pages.contact.description} kind="contact" />
      <Hero eyebrow="Contact us" title="Get in Touch with us" cta={false} />
      <ContactPanel variant="contact" />
      <Team />
      <Testimonial />
    </main>
  );
}
