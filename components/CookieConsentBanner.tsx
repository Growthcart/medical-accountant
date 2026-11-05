'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/db/client';

interface ConsentChoices {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [bannerMessage, setBannerMessage] = useState(
    'We use cookies to enhance your browsing experience and analyze site traffic.'
  );
  const db = useMemo(() => createClient(), []);

  const getConsentFromStorage = useCallback((): boolean => {
    try {
      return localStorage.getItem('cookie-consent-given') === 'true';
    } catch {
      return false;
    }
  }, []);

  const saveConsent = useCallback(
    (choices: ConsentChoices) => {
      try {
        localStorage.setItem('cookie-consent-given', 'true');
        localStorage.setItem('cookie-consent-choices', JSON.stringify(choices));
      } catch {
        // localStorage unavailable (e.g., Safari private browsing)
      }

      // Dispatch event so TrackingScripts can react immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cookie-consent-updated'));
      }

      // Persist consent to the database (fire and forget)
      const sessionId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      db
        .from('cookie_consents')
        .insert({
          session_id: sessionId,
          consent_given: true,
          consent_type: choices.analytics && choices.marketing ? 'all' : 'partial',
          analytics_consent: choices.analytics,
          marketing_consent: choices.marketing,
          essential_consent: choices.essential,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        })
        .then();

      setVisible(false);
    },
    [db]
  );

  const handleAcceptAll = useCallback(() => {
    saveConsent({ essential: true, analytics: true, marketing: true });
  }, [saveConsent]);

  const handleRejectAll = useCallback(() => {
    saveConsent({ essential: true, analytics: false, marketing: false });
  }, [saveConsent]);

  useEffect(() => {
    // If consent already given, nothing to do
    if (getConsentFromStorage()) return;

    // Fetch site settings for banner message and consent config
    async function init() {
      const { data: settings } = await db
        .from('site_settings')
        .select('cookie_consent_enabled, cookie_banner_message, cookie_uk_consent_required')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      // If consent system is disabled, auto-consent silently
      if (settings && !settings.cookie_consent_enabled) {
        saveConsent({ essential: true, analytics: true, marketing: true });
        return;
      }

      if (settings?.cookie_banner_message) {
        setBannerMessage(settings.cookie_banner_message);
      }

      const requireExplicitConsent = settings?.cookie_uk_consent_required ?? true;

      if (!requireExplicitConsent) {
        // No geo-detection needed, auto-consent
        saveConsent({ essential: true, analytics: true, marketing: true });
        return;
      }

      // Detect country via geo-location API
      try {
        const response = await fetch('/api/geo-location/');
        const geo = await response.json();

        if (geo.country === 'GB') {
          // UK user - show consent banner
          setVisible(true);
        } else {
          // Non-UK user - auto-consent silently
          saveConsent({ essential: true, analytics: true, marketing: true });
        }
      } catch {
        // Geo-location failed - default to US behavior (auto-consent)
        saveConsent({ essential: true, analytics: true, marketing: true });
      }
    }

    init();
  }, [db, getConsentFromStorage, saveConsent]);

  // Listen for cookie-consent-reset event (from footer Cookie Settings button)
  useEffect(() => {
    const handleReset = () => {
      try {
        localStorage.removeItem('cookie-consent-given');
        localStorage.removeItem('cookie-consent-choices');
      } catch {
        // localStorage unavailable
      }
      setVisible(true);
    };

    window.addEventListener('cookie-consent-reset', handleReset);
    return () => {
      window.removeEventListener('cookie-consent-reset', handleReset);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-[60px] left-0 right-0 z-[55] border-t border-gray-200 bg-white shadow-2xl lg:bottom-0">
      <div className="mx-auto max-w-container px-4 py-4 sm:px-6 md:py-6 lg:px-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-gray-700">
            {bannerMessage}
          </p>
          <div className="flex shrink-0 gap-3">
            <button
              onClick={handleRejectAll}
              className="rounded-lg bg-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
            >
              Reject All
            </button>
            <button
              onClick={handleAcceptAll}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
