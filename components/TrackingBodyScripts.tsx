'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/db/client';

// Sanitize tracking IDs to prevent injection
function sanitizeId(id: string | null): string {
  if (!id) return '';
  return id.replace(/[^a-zA-Z0-9\-_]/g, '');
}

interface BodySettings {
  gtm_id: string | null;
  custom_body_scripts: string | null;
}

interface ConsentChoices {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

function getConsentChoices(): ConsentChoices | null {
  try {
    const given = localStorage.getItem('cookie-consent-given');
    if (given !== 'true') return null;
    const raw = localStorage.getItem('cookie-consent-choices');
    if (!raw) return { essential: true, analytics: true, marketing: true };
    return JSON.parse(raw) as ConsentChoices;
  } catch {
    return null;
  }
}

export default function TrackingBodyScripts() {
  const [settings, setSettings] = useState<BodySettings | null>(null);
  const [consent, setConsent] = useState<ConsentChoices | null>(null);
  const [consentReady, setConsentReady] = useState(false);
  const db = useMemo(() => createClient(), []);

  // Fetch site settings on mount
  useEffect(() => {
    async function fetchSettings() {
      const { data } = await db
        .from('site_settings')
        .select('gtm_id, custom_body_scripts')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      if (data) {
        setSettings(data);
      }
    }

    fetchSettings();
  }, [db]);

  // Wait for consent: read once, then listen for events. No polling — the
  // previous 250ms × 5s loop was redundant with the event listener.
  useEffect(() => {
    const immediate = getConsentChoices();
    if (immediate) {
      setConsent(immediate);
      setConsentReady(true);
      return;
    }

    const fallback = window.setTimeout(() => {
      setConsentReady(true);
    }, 5000);

    const handleConsentUpdate = () => {
      const choices = getConsentChoices();
      if (choices) {
        setConsent(choices);
        setConsentReady(true);
        window.clearTimeout(fallback);
      }
    };

    window.addEventListener('cookie-consent-updated', handleConsentUpdate);
    window.addEventListener('storage', handleConsentUpdate);

    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener('cookie-consent-updated', handleConsentUpdate);
      window.removeEventListener('storage', handleConsentUpdate);
    };
  }, []);

  if (!settings) return null;

  const analyticsAllowed = consentReady && consent?.analytics === true;

  return (
    <>
      {/* GTM noscript iframe - requires analytics consent */}
      {analyticsAllowed && settings.gtm_id && (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${sanitizeId(settings.gtm_id)}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
      )}

      {/* Custom body scripts - admin-only content, rendered with dangerouslySetInnerHTML */}
      {settings.custom_body_scripts && (
        <div
          dangerouslySetInnerHTML={{ __html: settings.custom_body_scripts }}
        />
      )}
    </>
  );
}
