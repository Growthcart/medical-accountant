'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopBar from '@/components/admin/AdminTopBar';
import { returnToNextPath } from '@/lib/safeReturnPath';

// Client shell for every /admin page: auth gate, sidebar and top bar.
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, profileError, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileTimeout, setProfileTimeout] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Timeout: if user exists but profile stays null for 8 seconds, stop waiting
  useEffect(() => {
    if (loading || profile || !user) {
      setProfileTimeout(false);
      return;
    }
    const timer = setTimeout(() => setProfileTimeout(true), 8000);
    return () => clearTimeout(timer);
  }, [loading, profile, user]);

  useEffect(() => {
    if (loading) return;

    // Allow login page without auth
    if (pathname === '/admin/login' || pathname === '/admin/login/') {
      if (user && profile?.role === 'admin') {
        if (!returnToNextPath()) router.push('/admin/');
      }
      return;
    }

    // User is authenticated and confirmed admin — allow access
    if (user && profile?.role === 'admin') {
      return;
    }

    // User is logged in but profile hasn't loaded yet — wait (timeout will catch stuck state)
    if (user && !profile && !profileError && !profileTimeout) {
      return;
    }

    // No user, profile error/timeout, or user without admin role — redirect to login
    if (!user || profile?.role !== 'admin') {
      router.push('/admin/login/');
    }
  }, [user, profile, loading, profileError, profileTimeout, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        {/* Skeleton sidebar */}
        <div className="hidden lg:block w-56 flex-shrink-0 bg-[#0B0F19] border-r border-slate-800/80" />
        <div className="flex flex-1 flex-col min-w-0">
          {/* Skeleton topbar */}
          <div className="h-14 sm:h-16 bg-white border-b border-gray-200 flex-shrink-0" />
          {/* Skeleton content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Allow login page to render without admin check — no sidebar/topbar
  if (pathname === '/admin/login' || pathname === '/admin/login/') {
    return <>{children}</>;
  }

  // Render admin content only if currently verified admin
  if (user && profile?.role === 'admin') {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <AdminSidebar
          profile={profile}
          onSignOut={signOut}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <AdminTopBar
            profile={profile}
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
            onSignOut={signOut}
          />
          <main className="flex-1 overflow-y-auto p-3 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Profile failed to load — show error with retry
  if (user && !profile && (profileError || profileTimeout)) {
    return (
      <div className="flex h-screen bg-gray-100 items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Could not load admin profile</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your login session is valid but we couldn&apos;t fetch your admin profile. This may be a temporary issue.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setProfileTimeout(false);
                refreshProfile();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => {
                signOut();
                router.push('/admin/login/');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 items-center justify-center">
      <div className="animate-pulse flex items-center gap-3 text-gray-400">
        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Loading admin panel...</span>
      </div>
    </div>
  );
}
