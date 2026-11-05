'use client';

import { useEffect, useState, useMemo } from 'react';
import Script from 'next/script';
import { createClient } from '@/lib/db/client';

// Sanitize tracking IDs to prevent injection — only allow alphanumeric, hyphens, underscores
function sanitizeId(id: string | null): string {
  if (!id) return '';
  return id.replace(/[^a-zA-Z0-9\-_]/g, '');
}

interface SiteSettings {
  ga4_measurement_id: string | null;
  meta_pixel_id: string | null;
  gtm_id: string | null;
  twitter_pixel_id: string | null;
  linkedin_partner_id: string | null;
  tiktok_pixel_id: string | null;
  google_search_console_id: string | null;
  custom_head_scripts: string | null;
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

export default function TrackingScripts() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [consent, setConsent] = useState<ConsentChoices | null>(null);
  const [consentReady, setConsentReady] = useState(false);
  const db = useMemo(() => createClient(), []);

  // Fetch site settings on mount
  useEffect(() => {
    async function fetchSettings() {
      const { data } = await db
        .from('site_settings')
        .select(
          'ga4_measurement_id, meta_pixel_id, gtm_id, twitter_pixel_id, linkedin_partner_id, tiktok_pixel_id, google_search_console_id, custom_head_scripts'
        )
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      if (data) {
        setSettings(data);
      }
    }

    fetchSettings();
  }, [db]);

  // Wait for consent: read once on mount, then listen for the in-page event
  // (fired by CookieConsentBanner) and storage events from other tabs.
  // No polling — the previous 250ms × 5s loop was redundant with the event.
  useEffect(() => {
    const immediate = getConsentChoices();
    if (immediate) {
      setConsent(immediate);
      setConsentReady(true);
      return;
    }

    // Mark consent as "ready but unknown" after the banner has had a chance
    // to render. Without this, gated scripts never fire for users who never
    // touch the banner. 5s mirrors the previous poll timeout.
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
  const marketingAllowed = consentReady && consent?.marketing === true;

  // TESTING: GA4 and Meta Pixel load for every visitor regardless of the
  // cookie banner choice. Other trackers (GTM, Twitter, LinkedIn, TikTok)
  // remain gated on consent. Set this back to false (or delete the override
  // and use the per-tracker consent variables) once GDPR-compliant tracking
  // is required again.
  const ga4BypassConsent = true;
  const metaBypassConsent = true;

  // Sanitize all IDs before interpolating into scripts
  const ga4Id = sanitizeId(settings.ga4_measurement_id);
  const gtmId = sanitizeId(settings.gtm_id);
  const metaPixelId = sanitizeId(settings.meta_pixel_id);
  const twitterPixelId = sanitizeId(settings.twitter_pixel_id);
  const linkedinPartnerId = sanitizeId(settings.linkedin_partner_id);
  const tiktokPixelId = sanitizeId(settings.tiktok_pixel_id);

  // Diagnostic log — remove once tracking is verified.
  // Shows exactly what came back from site_settings so we can see whether
  // an ID was saved correctly in the admin.
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[TrackingScripts] settings loaded', {
      ga4_raw: settings.ga4_measurement_id,
      ga4Id,
      meta_raw: settings.meta_pixel_id,
      metaPixelId,
      gtm_raw: settings.gtm_id,
    });
  }

  return (
    <>
      {/* The Search Console verification tag is rendered on the server by
          app/layout.tsx (generateMetadata), so Google's verifier sees it. */}

      {/* Custom head scripts - admin-only content, rendered via next/script for safety */}
      {settings.custom_head_scripts && (
        <Script
          id="custom-head-scripts"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{ __html: settings.custom_head_scripts }}
        />
      )}

      {/* GA4 - requires analytics consent (currently bypassed for testing) */}
      {(ga4BypassConsent || analyticsAllowed) && ga4Id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="lazyOnload"
          />
          <Script
            id="ga4-init"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${ga4Id}');
              `,
            }}
          />
        </>
      )}

      {/* GTM - requires analytics consent */}
      {analyticsAllowed && gtmId && (
        <Script
          id="gtm-init"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `,
          }}
        />
      )}

      {/* Meta Pixel - requires marketing consent (currently bypassed for testing) */}
      {(metaBypassConsent || marketingAllowed) && metaPixelId && (
        <Script
          id="meta-pixel-init"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* Twitter Pixel - requires marketing consent */}
      {marketingAllowed && twitterPixelId && (
        <Script
          id="twitter-pixel-init"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
              },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
              a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
              twq('config','${twitterPixelId}');
            `,
          }}
        />
      )}

      {/* LinkedIn Insight Tag - requires marketing consent */}
      {marketingAllowed && linkedinPartnerId && (
        <Script
          id="linkedin-insight-init"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              _linkedin_partner_id = "${linkedinPartnerId}";
              window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
              window._linkedin_data_partner_ids.push(_linkedin_partner_id);
              (function(l) {
                if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
                window.lintrk.q=[]}
                var s = document.getElementsByTagName("script")[0];
                var b = document.createElement("script");
                b.type = "text/javascript";b.async = true;
                b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
                s.parentNode.insertBefore(b, s);})(window.lintrk);
            `,
          }}
        />
      )}

      {/* TikTok Pixel - requires marketing consent */}
      {marketingAllowed && tiktokPixelId && (
        <Script
          id="tiktok-pixel-init"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                ttq.load('${tiktokPixelId}');
                ttq.page();
              }(window, document, 'ttq');
            `,
          }}
        />
      )}
    </>
  );
}
