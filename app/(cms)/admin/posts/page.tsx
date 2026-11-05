'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/db/client';
import { notifySiteChange } from '@/lib/admin/notifySiteChange';
import {
  FileText,
  PlusCircle,
  Edit,
  Trash2,
  Star,
  Eye,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 50;

type StatusFilter = 'all' | 'published' | 'draft' | 'scheduled';

interface PostRow {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
}

function getStatusBadge(status: string, publishedAt: string | null) {
  const now = new Date().toISOString();
  if (status === 'draft') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Draft
      </span>
    );
  }
  if (publishedAt && publishedAt > now) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Scheduled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      Published
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [];
  pages.push(1);
  const rangeStart = Math.max(2, currentPage - 1);
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1);
  if (rangeStart > 2) pages.push('ellipsis');
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < totalPages - 1) pages.push('ellipsis');
  if (totalPages > 1) pages.push(totalPages);
  return pages;
}

export default function AdminPostsPage() {
  const db = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, statusFilter]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const now = new Date().toISOString();
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = db
      .from('posts')
      .select('id, title, slug, status, is_featured, published_at, created_at, category_id, categories(name, slug)')
      .order('created_at', { ascending: false })
      .range(from, to);

    let countQuery = db
      .from('posts')
      .select('id', { count: 'exact', head: true });

    if (debouncedSearch.trim()) {
      const pattern = `%${debouncedSearch.trim()}%`;
      query = query.ilike('title', pattern);
      countQuery = countQuery.ilike('title', pattern);
    }

    if (statusFilter === 'draft') {
      query = query.eq('status', 'draft');
      countQuery = countQuery.eq('status', 'draft');
    } else if (statusFilter === 'published') {
      query = query.eq('status', 'published').lte('published_at', now);
      countQuery = countQuery.eq('status', 'published').lte('published_at', now);
    } else if (statusFilter === 'scheduled') {
      query = query.eq('status', 'published').gt('published_at', now);
      countQuery = countQuery.eq('status', 'published').gt('published_at', now);
    }

    const [{ data, error }, { count }] = await Promise.all([query, countQuery]);

    if (!error && data) {
      const mapped: PostRow[] = data.map((p: Record<string, unknown>) => ({
        id: p.id as string,
        title: p.title as string,
        slug: p.slug as string,
        status: p.status as 'draft' | 'published',
        is_featured: p.is_featured as boolean,
        published_at: p.published_at as string | null,
        created_at: p.created_at as string,
        category_id: p.category_id as string | null,
        category_name: (p.categories as { name: string } | null)?.name || null,
        category_slug: (p.categories as { slug: string } | null)?.slug || null,
      }));
      setPosts(mapped);
    }
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [db, currentPage, debouncedSearch, statusFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDeletePost = async (postId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;
    const deleted = posts.find((p) => p.id === postId);
    const { error } = await db.from('posts').delete().eq('id', postId);
    if (!error) {
      // Take the post off the cached blog pages, sitemaps and feeds now.
      if (deleted?.status === 'published') {
        notifySiteChange({ previous: { slug: deleted.slug, categorySlug: deleted.category_slug, status: deleted.status } });
      }
      if (posts.length === 1 && currentPage > 1) setCurrentPage((prev) => prev - 1);
      else fetchPosts();
    }
  };

  const handleToggleFeatured = async (postId: string, currentValue: boolean) => {
    const { error } = await db.from('posts').update({ is_featured: !currentValue }).eq('id', postId);
    if (!error) {
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_featured: !currentValue } : p)));
      // The featured strip on the blog pages changes.
      notifySiteChange({ postId });
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, totalCount);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const emptyMessage = () => {
    if (debouncedSearch.trim() && statusFilter !== 'all') return `No ${statusFilter} posts matching "${debouncedSearch}".`;
    if (debouncedSearch.trim()) return `No posts matching "${debouncedSearch}".`;
    if (statusFilter === 'draft') return 'No draft posts.';
    if (statusFilter === 'published') return 'No published posts.';
    if (statusFilter === 'scheduled') return 'No scheduled posts.';
    return 'No posts yet. Create your first post to get started.';
  };

  return (
    <div>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your blog posts</p>
          </div>
          <Link href="/admin/posts/new/" className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
            <PlusCircle className="w-4 h-4" />
            New Post
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search posts..." className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600" />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Clear search">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:w-44">
            <option value="all">All Posts</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">{emptyMessage()}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">Title</th>
                    <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">Category</th>
                    <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">Status</th>
                    <th className="text-center text-xs uppercase text-gray-500 font-medium px-6 py-3">Featured</th>
                    <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">Published</th>
                    <th className="text-right text-xs uppercase text-gray-500 font-medium px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4"><Link href={`/admin/posts/${post.id}/edit/`} className="text-sm font-medium text-blue-600 hover:text-blue-800">{post.title}</Link></td>
                      <td className="px-6 py-4 text-sm text-gray-500">{post.category_name || '--'}</td>
                      <td className="px-6 py-4">{getStatusBadge(post.status, post.published_at)}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleToggleFeatured(post.id, post.is_featured)} className="focus:outline-none" title={post.is_featured ? 'Remove from featured' : 'Mark as featured'}>
                          <Star className={`w-5 h-5 ${post.is_featured ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`} />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(post.published_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/posts/${post.id}/preview/`} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Preview"><Eye className="w-4 h-4" /></Link>
                          <Link href={`/admin/posts/${post.id}/edit/`} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Edit"><Edit className="w-4 h-4" /></Link>
                          <button onClick={() => handleDeletePost(post.id, post.title)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <p className="text-sm text-gray-500">Showing {showingFrom}-{showingTo} of {totalCount} posts</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((prev) => prev - 1)} disabled={currentPage === 1} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-100 disabled:hover:bg-transparent">
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              {pageNumbers.map((page, idx) =>
                page === 'ellipsis' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-gray-400">...</span>
                ) : (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>{page}</button>
                )
              )}
              <button onClick={() => setCurrentPage((prev) => prev + 1)} disabled={currentPage === totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-100 disabled:hover:bg-transparent">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {totalPages <= 1 && totalCount > 0 && (
          <div className="mt-4"><p className="text-sm text-gray-500">Showing {showingFrom}-{showingTo} of {totalCount} posts</p></div>
        )}
      </div>
    </div>
  );
}
