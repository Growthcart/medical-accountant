import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import AdminShell from '@/components/admin/AdminShell';

// Admin pages are private: keep them out of search results. The auth
// context only loads here, so public pages don't ship it.
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}
