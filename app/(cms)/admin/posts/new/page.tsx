'use client';
/* eslint-disable @next/next/no-img-element -- admin-only tooling renders arbitrary user-uploaded / preview URLs (incl. data: URLs) where next/image's domain allowlist and optimisation are the wrong fit */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/db/client';
import { useAuth } from '@/contexts/AuthContext';
import { uploadPostImage, deletePostImage } from '@/lib/storage';
import TipTapEditor from '@/components/blog-cms/TipTapEditor';
import TagInput from '@/components/blog-cms/TagInput';
import { notifySiteChange } from '@/lib/admin/notifySiteChange';
import {
  ArrowLeft,
  Save,
  Loader2,
  Upload,
  Trash2,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateUniqueSlug(baseSlug: string, excludePostId?: string): Promise<string> {
  const db = createClient();
  let slug = baseSlug;
  let counter = 1;
  const MAX_ATTEMPTS = 100;

  while (counter <= MAX_ATTEMPTS) {
    let query = db.from('posts').select('id').eq('slug', slug);
    if (excludePostId) query = query.neq('id', excludePostId);
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  throw new Error(`Could not generate unique slug after ${MAX_ATTEMPTS} attempts`);
}

export default function NewPostPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const db = useMemo(() => createClient(), []);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [featuredImageAlt, setFeaturedImageAlt] = useState('');
  const [featuredImageCredit, setFeaturedImageCredit] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [publishedAt, setPublishedAt] = useState('');

  // SEO fields
  const [ogTitle, setOgTitle] = useState('');
  const [ogDescription, setOgDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [schemaType, setSchemaType] = useState('BlogPosting');
  const [showSeo, setShowSeo] = useState(false);

  // Media attachment fields
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | ''>('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaCredit, setMediaCredit] = useState('');
  const [showMedia, setShowMedia] = useState(false);

  // UI state
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await db
        .from('categories')
        .select('id, name, slug')
        .order('name');
      if (data) setCategories(data);
    }
    fetchCategories();
  }, [db]);

  // Auto-generate slug from title on blur (if not manually edited)
  const handleTitleBlur = useCallback(async () => {
    if (slugManuallyEdited || !title.trim()) return;
    const base = slugify(title);
    if (!base) return;
    setSlugChecking(true);
    try {
      const uniqueSlug = await generateUniqueSlug(base);
      setSlug(uniqueSlug);
    } catch {
      setSlug(base);
    } finally {
      setSlugChecking(false);
    }
  }, [title, slugManuallyEdited]);

  // Handle slug manual edit
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setSlug(slugify(e.target.value));
  };

  // Handle slug blur - verify uniqueness
  const handleSlugBlur = useCallback(async () => {
    if (!slug.trim()) return;
    setSlugChecking(true);
    try {
      const uniqueSlug = await generateUniqueSlug(slug);
      setSlug(uniqueSlug);
    } catch {
      // Keep current slug
    } finally {
      setSlugChecking(false);
    }
  }, [slug]);

  // Featured image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadPostImage(file);
      setFeaturedImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Delete featured image
  const handleImageDelete = async () => {
    if (!featuredImageUrl) return;
    try {
      await deletePostImage(featuredImageUrl);
    } catch {
      // Fail silently
    }
    setFeaturedImageUrl(null);
    setFeaturedImageAlt('');
    setFeaturedImageCredit('');
  };

  // Save post
  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    let finalSlug = slug;
    if (!finalSlug.trim()) {
      finalSlug = slugify(title);
    }
    if (!finalSlug.trim()) {
      setError('A valid slug is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Ensure slug is unique
      finalSlug = await generateUniqueSlug(finalSlug);

      // Determine published_at
      let publishedAtValue: string | null = null;
      if (status === 'published') {
        publishedAtValue = publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString();
      }

      // Insert post
      const { data: post, error: postError } = await db
        .from('posts')
        .insert({
          title: title.trim(),
          slug: finalSlug,
          content: content || null,
          excerpt: excerpt.trim() || null,
          featured_image_url: featuredImageUrl,
          featured_image_alt: featuredImageAlt.trim() || null,
          featured_image_credit: featuredImageCredit.trim() || null,
          category_id: categoryId || null,
          author_id: profile?.id || null,
          status,
          published_at: publishedAtValue,
          og_title: ogTitle.trim() || null,
          og_description: ogDescription.trim() || null,
          og_image: ogImage.trim() || null,
          canonical_url: canonicalUrl.trim() || null,
          schema_type: schemaType || 'BlogPosting',
          media_type: mediaType || null,
          media_url: mediaUrl.trim() || null,
          media_caption: mediaCaption.trim() || null,
          media_credit: mediaCredit.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (postError) throw new Error(postError.message);
      if (!post) throw new Error('Failed to create post');

      // Sync tags
      if (tags.length > 0) {
        for (const tagName of tags) {
          const tagSlug = slugify(tagName);
          // Find or create tag
          let { data: existingTag } = await db
            .from('tags')
            .select('id')
            .eq('slug', tagSlug)
            .maybeSingle();

          if (!existingTag) {
            const { data: newTag } = await db
              .from('tags')
              .insert({ name: tagName.trim(), slug: tagSlug })
              .select('id')
              .single();
            existingTag = newTag;
          }

          if (existingTag) {
            await db.from('post_tags').insert({
              post_id: post.id,
              tag_id: existingTag.id,
            });
          }
        }
      }

      // Refresh cached pages (blog listings, sitemaps, feeds).
      await notifySiteChange({ postId: post.id });

      router.push('/admin/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  // Format datetime for input
  const formatDateForInput = (isoString: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/')}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-600"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">New Post</h1>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Post'}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main content column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Title */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="Enter post title..."
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-lg text-gray-900"
              />
            </div>

            {/* Slug */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                Slug
                {slugChecking && (
                  <span className="ml-2 text-xs text-gray-400">
                    <Loader2 className="w-3 h-3 inline animate-spin" /> Checking...
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">/</span>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={handleSlugChange}
                  onBlur={handleSlugBlur}
                  placeholder="auto-generated-from-title"
                  className="flex-1 border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm font-mono text-gray-900"
                />
                <span className="text-sm text-gray-500">/</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Auto-generated from title. Edit to customize. Collision detection is automatic.
              </p>
            </div>

            {/* Excerpt */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
                Excerpt
              </label>
              <textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief summary of the post..."
                rows={3}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
              />
            </div>

            {/* Content editor */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <TipTapEditor content={content} onChange={setContent} />
            </div>

            {/* SEO Fields (collapsible) */}
            <div className="bg-white rounded-xl shadow-sm">
              <button
                type="button"
                onClick={() => setShowSeo(!showSeo)}
                className="w-full flex items-center justify-between p-6"
              >
                <span className="text-sm font-medium text-gray-700">SEO Settings</span>
                {showSeo ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {showSeo && (
                <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
                  <div>
                    <label htmlFor="og-title" className="block text-sm font-medium text-gray-700 mb-1">
                      OG Title
                    </label>
                    <input
                      id="og-title"
                      type="text"
                      value={ogTitle}
                      onChange={(e) => setOgTitle(e.target.value)}
                      placeholder="Open Graph title (defaults to post title)"
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="og-description" className="block text-sm font-medium text-gray-700 mb-1">
                      OG Description
                    </label>
                    <textarea
                      id="og-description"
                      value={ogDescription}
                      onChange={(e) => setOgDescription(e.target.value)}
                      placeholder="Open Graph description (defaults to excerpt)"
                      rows={2}
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="og-image" className="block text-sm font-medium text-gray-700 mb-1">
                      OG Image URL
                    </label>
                    <input
                      id="og-image"
                      type="url"
                      value={ogImage}
                      onChange={(e) => setOgImage(e.target.value)}
                      placeholder="https://medicalaccountant.ie/image.jpg (defaults to featured image)"
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="canonical-url" className="block text-sm font-medium text-gray-700 mb-1">
                      Canonical URL
                    </label>
                    <input
                      id="canonical-url"
                      type="url"
                      value={canonicalUrl}
                      onChange={(e) => setCanonicalUrl(e.target.value)}
                      placeholder="https://medicalaccountant.ie/original-article (leave blank for default)"
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank to use this page&apos;s own URL as canonical. Set only if this content was originally published elsewhere.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="schema-type" className="block text-sm font-medium text-gray-700 mb-1">
                      Schema Type
                    </label>
                    <select
                      id="schema-type"
                      value={schemaType}
                      onChange={(e) => setSchemaType(e.target.value)}
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
                    >
                      {/* Article types only: the post page emits headline, author
                          and dates, which other types do not accept. */}
                      <option value="BlogPosting">Blog Posting</option>
                      <option value="Article">Article</option>
                      <option value="NewsArticle">News Article</option>
                      <option value="TechArticle">Tech Article</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Select the structured data type for this page. BlogPosting is default for blog content.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Media Attachment (collapsible) */}
            <div className="bg-white rounded-xl shadow-sm">
              <button
                type="button"
                onClick={() => setShowMedia(!showMedia)}
                className="w-full flex items-center justify-between p-6"
              >
                <span className="text-sm font-medium text-gray-700">Media Attachment</span>
                {showMedia ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {showMedia && (
                <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
                  <div>
                    <label htmlFor="media-type" className="block text-sm font-medium text-gray-700 mb-1">
                      Media Type
                    </label>
                    <select
                      id="media-type"
                      value={mediaType}
                      onChange={(e) => setMediaType(e.target.value as 'image' | 'video' | 'audio' | '')}
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
                    >
                      <option value="">None</option>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="audio">Audio</option>
                    </select>
                  </div>
                  {mediaType && (
                    <>
                      <div>
                        <label htmlFor="media-url" className="block text-sm font-medium text-gray-700 mb-1">
                          Media URL
                        </label>
                        <input
                          id="media-url"
                          type="url"
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          placeholder="https://medicalaccountant.ie/media-file"
                          className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
                        />
                      </div>
                      <div>
                        <label htmlFor="media-caption" className="block text-sm font-medium text-gray-700 mb-1">
                          Caption
                        </label>
                        <input
                          id="media-caption"
                          type="text"
                          value={mediaCaption}
                          onChange={(e) => setMediaCaption(e.target.value)}
                          placeholder="Media caption"
                          className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
                        />
                      </div>
                      <div>
                        <label htmlFor="media-credit" className="block text-sm font-medium text-gray-700 mb-1">
                          Credit
                        </label>
                        <input
                          id="media-credit"
                          type="text"
                          value={mediaCredit}
                          onChange={(e) => setMediaCredit(e.target.value)}
                          placeholder="Media credit / attribution"
                          className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar column */}
          <div className="space-y-6">
            {/* Publish settings */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-sm font-medium text-gray-700 mb-4">Publish Settings</h2>

              <div className="space-y-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="draft"
                        checked={status === 'draft'}
                        onChange={() => setStatus('draft')}
                        className="text-blue-600 focus:ring-blue-600"
                      />
                      <span className="text-sm text-gray-700">Draft</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="published"
                        checked={status === 'published'}
                        onChange={() => setStatus('published')}
                        className="text-blue-600 focus:ring-blue-600"
                      />
                      <span className="text-sm text-gray-700">Published</span>
                    </label>
                  </div>
                </div>

                {/* Publication date */}
                {status === 'published' && (
                  <div>
                    <label htmlFor="published-at" className="block text-sm font-medium text-gray-700 mb-1">
                      Publication Date
                    </label>
                    <input
                      id="published-at"
                      type="datetime-local"
                      value={publishedAt ? formatDateForInput(publishedAt) : ''}
                      onChange={(e) => setPublishedAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank for immediate publication. Set a future date to schedule.
                    </p>
                    {publishedAt && new Date(publishedAt) > new Date() && (
                      <p className="mt-1 text-xs text-amber-600 font-medium">
                        This post will be scheduled and hidden until the specified date.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value || null)}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <TagInput tags={tags} onChange={setTags} />
            </div>

            {/* Featured image */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Featured Image
              </label>
              {featuredImageUrl ? (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={featuredImageUrl}
                      alt={featuredImageAlt || 'Featured image preview'}
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleImageDelete}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      aria-label="Delete featured image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <label htmlFor="image-alt" className="block text-sm font-medium text-gray-700 mb-1">
                      Alt Text
                    </label>
                    <input
                      id="image-alt"
                      type="text"
                      value={featuredImageAlt}
                      onChange={(e) => setFeaturedImageAlt(e.target.value)}
                      placeholder="Describe the image..."
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="image-credit" className="block text-sm font-medium text-gray-700 mb-1">
                      Image Source / Credit
                    </label>
                    <input
                      id="image-credit"
                      type="text"
                      value={featuredImageCredit}
                      onChange={(e) => setFeaturedImageCredit(e.target.value)}
                      placeholder="e.g., Photo by John Doe / Unsplash"
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-900"
                    />
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-500">
                    {uploading ? 'Uploading...' : 'Click to upload image'}
                  </span>
                  <span className="text-xs text-gray-400">JPEG, PNG, or WebP (max 5MB)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
