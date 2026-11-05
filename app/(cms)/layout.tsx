import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import '../admin.css'

// Second root layout: the admin has its own <html> (and the Tailwind stylesheet), separate from the public
// site's, so none of the site's header, footer or CSS reaches the admin and the admin's CSS never reaches the site.
const figtree = Figtree({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', variable: '--font-figtree' })

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

export default function CmsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
