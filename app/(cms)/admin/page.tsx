'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/db/client';
import {
  FileText,
  FolderOpen,
  ImageIcon,
  Settings,
  Menu,
  ArrowRightLeft,
  Tag,
  Clock,
  CheckCircle,
  FilePen,
  Inbox,
  UserCog,
  Map,
  Bot,
  Star,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const db = useMemo(() => createClient(), []);

  const [publishedCount, setPublishedCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [tagCount, setTagCount] = useState(0);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    const now = new Date().toISOString();

    const [publishedRes, draftRes, scheduledRes, catRes, tagRes] = await Promise.all([
      db
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .lte('published_at', now),
      db
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft'),
      db
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .gt('published_at', now),
      db.from('categories').select('id', { count: 'exact', head: true }),
      db.from('tags').select('id', { count: 'exact', head: true }),
    ]);

    setPublishedCount(publishedRes.count ?? 0);
    setDraftCount(draftRes.count ?? 0);
    setScheduledCount(scheduledRes.count ?? 0);
    setCategoryCount(catRes.count ?? 0);
    setTagCount(tagRes.count ?? 0);
    setOverviewLoading(false);
  }, [db]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your blog</p>
      </div>

      {overviewLoading ? (
        <div className="text-center py-12 text-gray-500">Loading overview...</div>
      ) : (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-500">Published</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{publishedCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <FilePen className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-500">Drafts</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{draftCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-500">Scheduled</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{scheduledCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <FolderOpen className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-500">Categories</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{categoryCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-medium text-gray-500">Tags</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{tagCount}</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <Link
                href="/admin/posts/"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">Posts</p>
                    <p className="text-sm text-gray-500">Create and manage posts</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/categories/"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">Categories</p>
                    <p className="text-sm text-gray-500">Organise post categories</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/images/"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">Images</p>
                    <p className="text-sm text-gray-500">Manage uploaded images</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/forms/"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <Inbox className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">Contact Forms</p>
                    <p className="text-sm text-gray-500">Manage forms & submissions</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/reviews/"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-gray-400 group-hover:text-yellow-500 transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">Reviews</p>
                    <p className="text-sm text-gray-500">Manage client reviews & testimonials</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/menus/"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <Menu className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">Menus</p>
                    <p className="text-sm text-gray-500">Manage navigation links</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/redirects/"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">Redirects</p>
                    <p className="text-sm text-gray-500">Manage URL redirect rules</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/site-settings/"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">Site Settings</p>
                    <p className="text-sm text-gray-500">Analytics, banners, cookies</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/admin/account/"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <UserCog className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">Account</p>
                    <p className="text-sm text-gray-500">Update your name & profile</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Sitemaps & LLMs */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sitemaps & LLMs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <Map className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">Sitemap</p>
                    <p className="text-sm text-gray-500">View XML sitemap (posts, categories, tags)</p>
                  </div>
                </div>
              </a>
              <a
                href="/image-sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">Image Sitemap</p>
                    <p className="text-sm text-gray-500">View image sitemap for Google Images</p>
                  </div>
                </div>
              </a>
              <a
                href="/llms.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <Bot className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">LLMs.txt</p>
                    <p className="text-sm text-gray-500">Summary for AI models (auto-updated)</p>
                  </div>
                </div>
              </a>
              <a
                href="/llms-full.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-lg shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <Bot className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">LLMs Full</p>
                    <p className="text-sm text-gray-500">Detailed version with services, pricing & blog</p>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
