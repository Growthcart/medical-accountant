'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ExternalLink, Menu, UserCog, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_photo_url: string | null;
  role: string;
}

interface AdminTopBarProps {
  profile: Profile | null;
  onMenuToggle: () => void;
  onSignOut?: () => Promise<void>;
}

function getPageTitle(pathname: string): string {
  const path = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  if (path === '/admin') return 'Dashboard';

  if (path.match(/^\/admin\/posts\/[^/]+\/edit$/)) return 'Edit Post';
  if (path.match(/^\/admin\/posts\/[^/]+\/preview$/)) return 'Preview Post';
  if (path === '/admin/posts/new') return 'New Post';
  if (path === '/admin/posts' || path.startsWith('/admin/posts')) return 'Posts';

  if (path === '/admin/categories' || path.startsWith('/admin/categories')) return 'Categories';
  if (path === '/admin/images' || path.startsWith('/admin/images')) return 'Images';
  if (path === '/admin/forms' || path.startsWith('/admin/forms')) return 'Forms';
  if (path === '/admin/menus' || path.startsWith('/admin/menus')) return 'Menus';
  if (path === '/admin/redirects' || path.startsWith('/admin/redirects')) return 'Redirects';
  if (path === '/admin/site-settings' || path.startsWith('/admin/site-settings')) return 'Site Settings';
  if (path === '/admin/account' || path.startsWith('/admin/account')) return 'Account';

  return 'Admin';
}

export default function AdminTopBar({ profile, onMenuToggle, onSignOut }: AdminTopBarProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserDropdownOpen(false);
      }
    };

    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userDropdownOpen]);

  // Compute initials for avatar fallback
  const userName = profile?.full_name || profile?.username || 'Admin';
  const userInitials = (() => {
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return userName.slice(0, 2).toUpperCase();
  })();

  return (
    <div className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 -ml-1.5 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-gray-900">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View Site
        </a>

        <div className="hidden sm:block h-6 w-px bg-gray-200" />

        {/* User Menu with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setUserDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 -mr-1 rounded-xl hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
            aria-expanded={userDropdownOpen}
            aria-haspopup="true"
          >
            {profile?.profile_photo_url ? (
              <Image
                src={profile.profile_photo_url}
                alt={userName}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-coral-500 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                {userInitials}
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5 text-left">
              <span className="text-sm font-medium text-gray-800 truncate max-w-[140px]">
                {userName}
              </span>
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 text-gray-400 transition-transform duration-200',
                  userDropdownOpen && 'rotate-180',
                )}
              />
            </div>
          </button>

          {/* User Options Dropdown */}
          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-gray-200 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              <Link
                href="/admin/account/"
                onClick={() => setUserDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <UserCog className="w-4 h-4 text-gray-400" />
                Account Settings
              </Link>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={async () => {
                  setUserDropdownOpen(false);
                  if (onSignOut) await onSignOut();
                }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
