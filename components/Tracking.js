import { TRACKING, safeId } from '@/lib/tracking';

// Rendered in <head> on the server, so GA4, Google Ads and the Meta Pixel are in the first HTML response
// (Google's tag checker, Tag Assistant and Meta Pixel Helper see them without running the page's JS).
// Consent Mode v2: everything starts denied and is updated from the visitor's banner choice
// (localStorage keys written by ConsentBanner). The Meta Pixel sends nothing until marketing consent is granted.
export default function Tracking() {
  const ga = safeId(TRACKING.ga4);
  const ads = safeId(TRACKING.ads);
  const px = safeId(TRACKING.metaPixel);
  const gtagIds = [ga, ads].filter(Boolean);
  if (!gtagIds.length && !px) return null;

  const js = `
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
function mcRead(){try{return localStorage.getItem('cookie-consent-given')==='true'?JSON.parse(localStorage.getItem('cookie-consent-choices')||'{}'):null}catch(e){return null}}
var mcMarketing=false;
function mcApply(c){c=c||{};var g=function(v){return v?'granted':'denied'};
gtag('consent','update',{analytics_storage:g(c.analytics),ad_storage:g(c.marketing),ad_user_data:g(c.marketing),ad_personalization:g(c.marketing)});
if(window.fbq){fbq('consent',c.marketing?'grant':'revoke');if(c.marketing&&!mcMarketing)fbq('track','PageView')}
mcMarketing=!!c.marketing}
gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
var mcStored=mcRead();
if(mcStored)gtag('consent','update',{analytics_storage:mcStored.analytics?'granted':'denied',ad_storage:mcStored.marketing?'granted':'denied',ad_user_data:mcStored.marketing?'granted':'denied',ad_personalization:mcStored.marketing?'granted':'denied'});
gtag('js',new Date());
${gtagIds.map((id) => `gtag('config','${id}');`).join('\n')}
${px ? `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
mcMarketing=!!(mcStored&&mcStored.marketing);
fbq('consent',mcMarketing?'grant':'revoke');
fbq('init','${px}');fbq('track','PageView');` : ''}
window.addEventListener('cookie-consent-updated',function(){mcApply(mcRead())});
`;

  return (
    <>
      {gtagIds[0] && <script async src={`https://www.googletagmanager.com/gtag/js?id=${gtagIds[0]}`} />}
      <script dangerouslySetInnerHTML={{ __html: js }} />
    </>
  );
}
