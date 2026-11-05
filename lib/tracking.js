// Tracking and verification codes. An env var overrides the default; set one to an empty string to switch that tool off.
// The defaults are the codes already live on the WordPress site (medicalaccountant.ie).
export const TRACKING = {
  ga4: process.env.NEXT_PUBLIC_GA4_ID ?? 'G-Y4YRH7NX8L',
  ads: process.env.NEXT_PUBLIC_GADS_ID ?? 'AW-1037014354',
  // Google Ads conversion label for the enquiry form (the part after "AW-…/"). Not known yet, so no Ads conversion fires until set.
  adsLeadLabel: process.env.NEXT_PUBLIC_GADS_LEAD_LABEL ?? '',
  metaPixel: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '218136276851539',
  searchConsole: process.env.NEXT_PUBLIC_GSC_TOKEN ?? 'eieTvyrS39J--m3x6wbSwQZGPcJvK2RFDL7z2by7-DQ',
};

// IDs end up inside inline scripts, so only plain ID characters are allowed.
export const safeId = (s) => (/^[A-Za-z0-9_-]+$/.test(s || '') ? s : '');
