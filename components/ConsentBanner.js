'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/db/client';

// Cookie banner for Irish/EU visitors: shown to everyone until they choose, "Reject" as prominent as "Accept".
// The choice is stored in localStorage (read by components/Tracking.js) and logged to the cookie_consents table.
export default function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('cookie-consent-given') !== 'true') setShow(true);
    } catch {
      setShow(true);
    }
    const reopen = () => setShow(true);
    window.addEventListener('cookie-consent-reset', reopen);
    return () => window.removeEventListener('cookie-consent-reset', reopen);
  }, []);

  function save(analytics, marketing) {
    const choices = { essential: true, analytics, marketing };
    try {
      localStorage.setItem('cookie-consent-given', 'true');
      localStorage.setItem('cookie-consent-choices', JSON.stringify(choices));
    } catch {
      /* storage blocked: the choice only lasts for this page */
    }
    window.dispatchEvent(new Event('cookie-consent-updated'));
    // Consent log. It must never block the visitor, so errors are ignored.
    try {
      createClient()
        .from('cookie_consents')
        .insert({
          session_id: crypto.randomUUID(),
          consent_given: true,
          consent_type: analytics && marketing ? 'all' : analytics || marketing ? 'partial' : 'essential',
          analytics_consent: analytics,
          marketing_consent: marketing,
          essential_consent: true,
          user_agent: navigator.userAgent,
        })
        .then(() => {}, () => {});
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;
  return (
    <div className="consent" role="dialog" aria-label="Cookie consent">
      <p>
        We use cookies to measure how the site is used and, with your permission, for advertising. Essential cookies are always on. You can change your choice at any time using “Cookie settings” in the footer.
      </p>
      <div className="consent__actions">
        <button type="button" className="btn-outline-navy" onClick={() => save(false, false)}>Reject non-essential</button>
        <button type="button" className="btn-gold" onClick={() => save(true, true)}>Accept all</button>
      </div>
    </div>
  );
}

export function CookieSettingsLink({ className }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event('cookie-consent-reset'))}>
      Cookie settings
    </button>
  );
}
