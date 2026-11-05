'use client';
/* eslint-disable @next/next/no-img-element -- admin-only tooling renders arbitrary user-uploaded / preview URLs (incl. data: URLs) where next/image's domain allowlist and optimisation are the wrong fit */

import { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizePostHtml } from '@/lib/blog/sanitizePostHtml';
import {
  Loader2,
  X,
  ArrowLeft,
  Edit,
  Calendar,
  Tag,
  FolderOpen,
} from 'lucide-react';
import React from 'react';

interface PostData {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  media_type: 'image' | 'video' | 'audio' | null;
  media_url: string | null;
  media_caption: string | null;
  media_credit: string | null;
}

interface CategoryData {
  name: string;
  slug: string;
}

interface PreviewPostPageProps {
  params: Promise<{ id: string }>;
}

export default function PreviewPostPage(props: PreviewPostPageProps) {
  const params = use(props.params);
  const router = useRouter();
  const { profile } = useAuth();
  const db = useMemo(() => createClient(), []);

  const postId = params.id;
  const [post, setPost] = useState<PostData | null>(null);
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Fetch post data
  useEffect(() => {
    if (!postId) return;

    async function fetchPost() {
      setLoading(true);
      setError(null);

      // Fetch post by ID (admin RLS gives full access, no status filter needed)
      const { data: postData, error: postError } = await db
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (postError || !postData) {
        setError('Post not found');
        setLoading(false);
        return;
      }

      setPost(postData);

      // Fetch category if assigned
      if (postData.category_id) {
        const { data: catData } = await db
          .from('categories')
          .select('name, slug')
          .eq('id', postData.category_id)
          .maybeSingle();
        if (catData) setCategory(catData);
      }

      // Fetch tags
      const { data: postTags } = await db
        .from('post_tags')
        .select('tag_id')
        .eq('post_id', postId);

      if (postTags && postTags.length > 0) {
        const tagIds = postTags.map((pt: any) => pt.tag_id);
        const { data: tagData } = await db
          .from('tags')
          .select('name')
          .in('id', tagIds);
        if (tagData) {
          setTags(tagData.map((t: any) => t.name));
        }
      }

      setLoading(false);
    }

    fetchPost();
  }, [postId, db]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-600">{error || 'Post not found'}</p>
          <button
            type="button"
            onClick={() => router.push('/admin/')}
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusLabel = (() => {
    if (post.status === 'draft') return 'Draft';
    if (post.published_at && new Date(post.published_at) > new Date()) return 'Scheduled';
    return 'Published';
  })();

  const statusColor = (() => {
    if (post.status === 'draft') return 'bg-gray-100 text-gray-800';
    if (post.published_at && new Date(post.published_at) > new Date()) return 'bg-amber-100 text-amber-800';
    return 'bg-green-100 text-green-800';
  })();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Preview Mode Banner */}
      {!bannerDismissed && (
        <div className="bg-yellow-100 border-b border-yellow-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-yellow-800 text-sm font-medium">
                Preview Mode
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                {statusLabel}
              </span>
              <span className="text-yellow-700 text-sm">
                This post is not publicly visible.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/admin/posts/${postId}/edit/`)}
                className="inline-flex items-center gap-1.5 text-sm text-yellow-800 hover:text-yellow-900 font-medium"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="p-1 text-yellow-600 hover:text-yellow-800 rounded transition-colors"
                aria-label="Dismiss preview banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post content - styled like public post page */}
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button (for admin navigation) */}
        <button
          type="button"
          onClick={() => router.push('/admin/')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Featured image */}
        {post.featured_image_url && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img
              src={post.featured_image_url}
              alt={post.featured_image_alt || post.title}
              className="w-full h-auto max-h-[500px] object-cover"
            />
          </div>
        )}

        {/* Post header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {post.published_at && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(post.published_at)}
              </span>
            )}

            {category && (
              <span className="inline-flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4" />
                {category.name}
              </span>
            )}
          </div>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="mt-4 text-lg text-gray-600 leading-relaxed">
              {post.excerpt}
            </p>
          )}
        </header>

        {/* Post content */}
        {post.content && (
          <div
            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: sanitizePostHtml(post.content) }}
          />
        )}

        {/* Media attachment */}
        {post.media_type && post.media_url && (
          <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden">
            {post.media_type === 'image' && (
              <img
                src={post.media_url}
                alt={post.media_caption || 'Media attachment'}
                className="w-full h-auto"
              />
            )}
            {post.media_type === 'video' && (
              <video
                src={post.media_url}
                controls
                className="w-full"
              >
                <track kind="captions" />
                Your browser does not support the video element.
              </video>
            )}
            {post.media_type === 'audio' && (
              <div className="p-6">
                <audio src={post.media_url} controls className="w-full">
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
            {(post.media_caption || post.media_credit) && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                {post.media_caption && (
                  <p className="text-sm text-gray-700">{post.media_caption}</p>
                )}
                {post.media_credit && (
                  <p className="text-xs text-gray-500 mt-1">Credit: {post.media_credit}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-gray-400" />
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
