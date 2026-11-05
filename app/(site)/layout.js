import '@/app/css/layout.css';
import '@/app/css/about.css';
import '@/app/css/blog-post.css';
import '@/app/css/extra.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Behavior from '@/components/Behavior';
import Tracking from '@/components/Tracking';
import ConsentBanner from '@/components/ConsentBanner';
import { ClickEvents } from '@/components/TrackingEvents';
import { SITE } from '@/lib/site';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import { TRACKING } from '@/lib/tracking';

export const metadata = {
  metadataBase: new URL(SITE.url),
  applicationName: SITE.name,
  // Search Console ownership tag, rendered into the server HTML <head>.
  ...(TRACKING.searchConsole && { verification: { google: TRACKING.searchConsole } }),
  icons: { icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/images/icons/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/images/icons/apple-touch-icon.png' },
  openGraph: { type: 'website', siteName: SITE.name, locale: 'en_IE', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', images: [DEFAULT_OG_IMAGE.url] },
  alternates: { types: { 'application/rss+xml': [{ url: '/feed.xml', title: 'MedicalAccountant.ie News' }] } },
  robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
};
export const viewport = { themeColor: '#0a1f44' };

const FONTS = ['inter-latin-400-normal.C38fXH4l', 'figtree-latin-600-normal.Cv_xCTDl', 'figtree-latin-700-normal.th6qEP7c'];

export default function RootLayout({ children }) {
  return (
    <html lang="en-IE">
      <head>
        <Tracking />
        {FONTS.map((f) => (
          <link key={f} rel="preload" href={`/_astro/${f}.woff2`} as="font" type="font/woff2" crossOrigin="" />
        ))}
      </head>
      <body className="font-sans">
        <Header />
        {children}
        <Footer />
        <ConsentBanner />
        <ClickEvents />
        <Behavior src="/_astro/Navbar.astro_astro_type_script_index_0_lang.BqrRPHpG.js" />
        <Behavior src="/_astro/Layout.astro_astro_type_script_index_0_lang.B5CIuRrx.js" />
      </body>
    </html>
  );
}
