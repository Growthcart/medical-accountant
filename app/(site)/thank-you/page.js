import Hero from '@/components/Hero';
import { LeadConversion } from '@/components/TrackingEvents';
import { pageMeta } from '@/lib/site';

export const metadata = { ...pageMeta('thank-you', '/thank-you/'), robots: { index: false, follow: false } };

export default function ThankYou() {
  return (
    <main id="main">
      <LeadConversion />
      <Hero title="Thank You" lead={['Thank you for sharing your details, Our team will be in touch with you shortly.']} cta={false} />
    </main>
  );
}
