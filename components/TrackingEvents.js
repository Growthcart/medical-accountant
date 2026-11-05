'use client';
import { useEffect } from 'react';
import { TRACKING, safeId } from '@/lib/tracking';

// Phone and email link clicks, sent to GA4 and Meta (both only transmit what the visitor's consent allows).
export function ClickEvents() {
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest?.('a[href^="tel:"], a[href^="mailto:"]');
      if (!a) return;
      const kind = a.href.startsWith('tel:') ? 'phone' : 'email';
      window.gtag?.('event', 'contact_click', { contact_method: kind, link_url: a.href });
      window.fbq?.('track', 'Contact');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}

// Fires once per visit on /thank-you/ (the page the enquiry form redirects to).
export function LeadConversion() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem('lead-tracked')) return;
      sessionStorage.setItem('lead-tracked', '1');
    } catch {
      /* storage blocked: may count twice on refresh, which is acceptable */
    }
    window.gtag?.('event', 'generate_lead', { form: 'enquiry' });
    const ads = safeId(TRACKING.ads);
    if (ads && TRACKING.adsLeadLabel) window.gtag?.('event', 'conversion', { send_to: `${ads}/${TRACKING.adsLeadLabel}` });
    window.fbq?.('track', 'Lead');
  }, []);
  return null;
}
