'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  ImageIcon,
  Menu,
  ArrowRightLeft,
  Settings,
  ExternalLink,
  LogOut,
  X,
  Inbox,
  UserCog,
  Map,
  ChevronDown,
  Bot,
  Building2,
  Star,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_photo_url: string | null;
  role: string;
}

interface AdminSidebarProps {
  profile: Profile | null;
  onSignOut: () => Promise<void>;
  open: boolean;
  onClose: () => void;
}

const mainNavItems = [
  { href: '/admin/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/posts/', label: 'Posts', icon: FileText },
  { href: '/admin/categories/', label: 'Categories', icon: FolderOpen },
  { href: '/admin/images/', label: 'Images', icon: ImageIcon },
  { href: '/admin/forms/', label: 'Forms', icon: Inbox },
  { href: '/admin/reviews/', label: 'Reviews', icon: Star },
  { href: '/admin/time-tracking/', label: 'Time Tracking', icon: Clock },
];

const secondaryNavItems = [
  { href: '/admin/menus/', label: 'Menus', icon: Menu },
  { href: '/admin/redirects/', label: 'Redirects', icon: ArrowRightLeft },
  { href: '/admin/site-settings/', label: 'Site Settings', icon: Settings },
  { href: '/admin/business/', label: 'Business Info', icon: Building2 },
];

const sitemapItems = [
  { href: '/sitemap.xml', label: 'Sitemap', icon: Map },
  { href: '/image-sitemap.xml', label: 'Image Sitemap', icon: ImageIcon },
  { href: '/llms.txt', label: 'LLMs.txt', icon: Bot },
  { href: '/llms-full.txt', label: 'LLMs Full', icon: Bot },
];

export default function AdminSidebar({ profile, onSignOut, open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [sitemapsOpen, setSitemapsOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin/') {
      return pathname === '/admin' || pathname === '/admin/';
    }
    return pathname.startsWith(href) || pathname.startsWith(href.slice(0, -1));
  };

  // User initials for avatar fallback
  const userInitials = (() => {
    const name = profile?.full_name || profile?.username || 'Admin';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  })();

  const userName = profile?.full_name || profile?.username || 'Admin';

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar: Fixed drawer on mobile, static in flex layout on desktop so content never hides */}
      <aside
        aria-label="Admin Sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-56 bg-[#0B0F19] text-slate-300 flex flex-col transform transition-transform duration-200 ease-in-out border-r border-slate-800/80 shadow-xl lg:static lg:z-auto lg:translate-x-0 flex-shrink-0 h-screen',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand Header — Logo + View Site button right next to it */}
        <div className="h-14 px-3.5 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0">
          <Link
            href="/admin/"
            className="flex flex-col items-start gap-0.5 min-w-0"
            onClick={onClose}
          >
            <Image
              src="/images/logo.svg"
              alt="MedicalAccountant.ie"
              width={125}
              height={30}
              className="h-7 w-auto brightness-0 invert"
              priority
            />
            <span className="text-gray-400 text-[10px] font-medium tracking-wide pl-0.5">
              MedicalAccountant.ie CMS
            </span>
          </Link>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* View Site right next to logo */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              title="View Public Site"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                  active
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
                )}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-white' : 'text-slate-400')} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {/* Subtle Divider */}
          <div className="my-2 border-t border-slate-800/80" />

          {secondaryNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                  active
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
                )}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-white' : 'text-slate-400')} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {/* Sitemaps Collapsible */}
          <div className="pt-1">
            <button
              onClick={() => setSitemapsOpen(!sitemapsOpen)}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-2.5 truncate">
                <Map className="w-4 h-4 flex-shrink-0 text-slate-400" />
                <span className="truncate">Sitemaps & Feeds</span>
              </span>
              <ChevronDown
                className={cn('w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0', sitemapsOpen && 'rotate-180')}
              />
            </button>

            {sitemapsOpen && (
              <div className="ml-4 pl-2.5 border-l border-slate-800 space-y-0.5 mt-0.5">
                {sitemapItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Bottom Profile Bar — Combined Single Row */}
        <div className="p-2 border-t border-slate-800/80 bg-slate-950/40 flex-shrink-0">
          <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            {/* User Info (Avatar + Name + Role) */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex-shrink-0">
                {profile?.profile_photo_url ? (
                  <Image
                    src={profile.profile_photo_url}
                    alt={userName}
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-500 to-coral-500 flex items-center justify-center text-white font-bold text-[11px] ring-1 ring-white/10 shadow-sm">
                    {userInitials}
                  </div>
                )}
                <span
                  title="Online"
                  className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900"
                />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {userName}
                </p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  <p className="text-[10px] text-slate-400 font-medium capitalize truncate leading-tight">
                    {profile?.role || 'Admin'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions (Account Settings + Sign Out) */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Link
                href="/admin/account/"
                onClick={onClose}
                title="Account Settings"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <UserCog className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={onSignOut}
                title="Sign Out"
                className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
