import type { DbClient } from '@/lib/db/server';
import { createServiceClient } from '@/lib/db/server';
import { authorSlug } from '@/lib/authors';
import { slugify } from '@/lib/blog/slug';
import { pingIndexNow, revalidatePostPaths } from '@/lib/blog/revalidate';
import { clearRedirectsFrom, recordMove } from '@/lib/blog/redirects';
import { postPath, type PostUrlStructure } from '@/lib/blog/postUrl';
import { getPostUrlStructure } from '@/lib/blog/postUrlStructure';

// Shared server-side publishing logic used by the posts API routes and the
// MCP connector (and therefore by the Claude Code MCP server). Everything that
// must happen when a post is written lives here: slug handling, redirects on
// rename, tag sync and cache invalidation.

export type PostStatus = 'draft' | 'published';

export interface PostWriteInput {
  title: string;
  content?: string | null;
  excerpt?: string | null;
  slug?: string | null;
  status?: PostStatus;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
  featured_image_credit?: string | null;
  category_id?: string | null;
  category_slug?: string | null;
  author_id?: string | null;
  author_username?: string | null;
  tags?: string[] | null;
  published_at?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  canonical_url?: string | null;
  schema_type?: string | null;
  is_featured?: boolean | null;
}

export interface PostSummary {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  published_at: string | null;
  updated_at: string;
  is_featured: boolean | null;
  category: { id: string; name: string; slug: string } | null;
  author: { id: string; username: string | null; full_name: string | null } | null;
  tags: string[];
  // Public URL once published (null for drafts).
  url: string | null;
  // True when published with a future date (not live until then).
  scheduled: boolean;
}

export class PostApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export { slugify };

const SCHEMA_TYPES = ['BlogPosting', 'Article', 'NewsArticle', 'TechArticle', 'HowTo'];

// Untyped service client: the generated Database types do not describe the
// table relationships, so embedded selects are typed loosely here.
function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

const POST_SELECT = `
  id, title, slug, status, excerpt, content, featured_image_url, featured_image_alt,
  featured_image_credit, og_title, og_description, og_image, canonical_url, schema_type,
  published_at, updated_at, created_at, is_featured, author_id, category_id,
  categories(id, name, slug),
  profiles(id, username, full_name),
  post_tags(tags(name, slug))
`;

function first<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function toPostSummary(row: any, structure: PostUrlStructure, includeContent = false): PostSummary & { content?: string | null } {
  const category = first<any>(row.categories);
  const author = first<any>(row.profiles);
  const published = row.status === 'published';
  const summary: PostSummary & { content?: string | null } = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    excerpt: row.excerpt ?? null,
    featured_image_url: row.featured_image_url ?? null,
    featured_image_alt: row.featured_image_alt ?? null,
    published_at: row.published_at ?? null,
    updated_at: row.updated_at,
    is_featured: row.is_featured ?? null,
    category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
    author: author ? { id: author.id, username: author.username ?? null, full_name: author.full_name ?? null } : null,
    tags: (row.post_tags || []).map((pt: any) => first<any>(pt.tags)?.name).filter(Boolean),
    url: published ? `${siteUrl()}${postPath(row.slug, category?.slug, structure)}` : null,
    scheduled: published && !!row.published_at && new Date(row.published_at).getTime() > Date.now(),
  };
  if (includeContent) summary.content = row.content ?? null;
  return summary;
}

// An author by id, username, or the slug of their full name (profiles do not
// always have a username).
export async function resolveAuthorId(input: { author_id?: string | null; author_username?: string | null }): Promise<string | null> {
  if (input.author_id) return input.author_id;
  const wanted = input.author_username?.trim().replace(/^@/, '').toLowerCase();
  if (!wanted) return null;
  const { data } = await createServiceClient().from('profiles').select('id, username, full_name');
  const profiles = (data || []) as Array<{ id: string; username: string | null; full_name: string | null }>;
  const match =
    profiles.find((p) => p.username?.toLowerCase() === wanted) ||
    profiles.find((p) => p.full_name && authorSlug(p.full_name) === authorSlug(wanted));
  return match?.id ?? null;
}

export async function resolveCategoryId(input: { category_id?: string | null; category_slug?: string | null }): Promise<string | null> {
  if (input.category_id) return input.category_id;
  if (!input.category_slug) return null;
  const { data } = await createServiceClient().from('categories').select('id').eq('slug', input.category_slug).maybeSingle();
  if (!data) throw new PostApiError(`Unknown category slug "${input.category_slug}". Use list_categories.`, 400);
  return data.id;
}

export async function getPostRow(where: { id?: string; slug?: string }): Promise<any | null> {
  let query = createServiceClient().from('posts').select(POST_SELECT);
  if (where.id) query = query.eq('id', where.id);
  else if (where.slug) query = query.eq('slug', where.slug);
  else return null;
  const { data, error } = await query.maybeSingle();
  if (error) throw new PostApiError(error.message, 500);
  return data;
}

export async function listPostRows(filters: {
  q?: string | null;
  status?: string | null;
  category_slug?: string | null;
  author_username?: string | null;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  let query = createServiceClient()
    .from('posts')
    .select(POST_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.q) query = query.ilike('title', `%${filters.q.replace(/[%_,()]/g, '')}%`);
  if (filters.category_slug) {
    const categoryId = await resolveCategoryId({ category_slug: filters.category_slug });
    if (categoryId) query = query.eq('category_id', categoryId);
  }
  if (filters.author_username) {
    const authorId = await resolveAuthorId({ author_username: filters.author_username });
    if (!authorId) return { rows: [], total: 0 };
    query = query.eq('author_id', authorId);
  }

  const { data, error, count } = await query;
  if (error) throw new PostApiError(error.message, 500);
  return { rows: (data || []) as any[], total: count ?? 0 };
}

// Replace a post's tag set, creating any tags that do not exist yet.
export async function syncPostTags(postId: string, tags: string[]): Promise<void> {
  const db = createServiceClient();
  const names = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));

  await db.from('post_tags').delete().eq('post_id', postId);
  if (names.length === 0) return;

  const tagIds: string[] = [];
  for (const name of names) {
    const slug = slugify(name);
    if (!slug) continue;
    const { data: bySlug } = await db.from('tags').select('id').eq('slug', slug).maybeSingle();
    const existing = bySlug || (await db.from('tags').select('id').ilike('name', name.replace(/[%_]/g, '')).maybeSingle()).data;
    if (existing) {
      tagIds.push(existing.id);
      continue;
    }
    const { data: created, error } = await db.from('tags').insert({ name, slug }).select('id').single();
    if (error) throw new PostApiError(`Failed to create tag "${name}": ${error.message}`, 500);
    tagIds.push(created.id);
  }

  const unique = Array.from(new Set(tagIds));
  if (unique.length === 0) return;
  const { error } = await db.from('post_tags').insert(unique.map((tag_id) => ({ post_id: postId, tag_id })));
  if (error) throw new PostApiError(`Failed to attach tags: ${error.message}`, 500);
}

function normaliseSchemaType(value: string | null | undefined): string {
  return value && SCHEMA_TYPES.includes(value) ? value : 'BlogPosting';
}

export interface WriteResult {
  post: PostSummary & { content?: string | null };
  created: boolean;
  revalidated: string[];
}

export async function createPost(input: PostWriteInput): Promise<WriteResult> {
  const db = createServiceClient();

  if (!input.title?.trim()) throw new PostApiError('title is required');
  const status: PostStatus = input.status === 'draft' ? 'draft' : 'published';
  if (status === 'published' && !input.content?.trim()) {
    throw new PostApiError('content is required to publish');
  }

  const author_id = await resolveAuthorId(input);
  if (!author_id) throw new PostApiError('author_id or author_username is required (and must exist). Use list_authors.');
  const category_id = await resolveCategoryId(input);

  const slug = slugify(input.slug || input.title);
  if (!slug) throw new PostApiError('Could not derive a slug from the title');

  const { data: existing } = await db.from('posts').select('id').eq('slug', slug).maybeSingle();
  if (existing) {
    throw new PostApiError(`A post with slug "${slug}" already exists (id ${existing.id}). Use update instead.`, 409);
  }

  const now = new Date().toISOString();
  const postData: Record<string, unknown> = {
    author_id,
    title: input.title.trim(),
    slug,
    content: input.content ?? null,
    excerpt: input.excerpt?.trim() || null,
    featured_image_url: input.featured_image_url ?? null,
    featured_image_alt: input.featured_image_alt?.trim() || null,
    featured_image_credit: input.featured_image_credit?.trim() || null,
    category_id,
    status,
    published_at: status === 'published' ? (input.published_at || now) : (input.published_at || null),
    og_title: input.og_title?.trim() || null,
    og_description: input.og_description?.trim() || null,
    og_image: input.og_image?.trim() || null,
    canonical_url: input.canonical_url?.trim() || null,
    schema_type: normaliseSchemaType(input.schema_type),
    is_featured: input.is_featured ?? false,
    updated_at: now,
  };

  const { data: inserted, error } = await db.from('posts').insert(postData).select('id').single();
  if (error) throw new PostApiError(error.message, 500);

  if (input.tags) await syncPostTags(inserted.id, input.tags);

  const row = await getPostRow({ id: inserted.id });
  const structure = await getPostUrlStructure();
  const summary = toPostSummary(row, structure);

  let revalidated: string[] = [];
  if (status === 'published') {
    await clearRedirectsFrom(postPath(slug, summary.category?.slug, structure));
    revalidated = revalidatePostPaths({ slug, categorySlug: summary.category?.slug, structure });
    if (!summary.scheduled) await pingIndexNow({ slug, categorySlug: summary.category?.slug ?? null, structure });
  }

  return { post: summary, created: true, revalidated };
}

export async function updatePost(where: { id?: string; slug?: string }, input: Partial<PostWriteInput>): Promise<WriteResult> {
  const db = createServiceClient();
  const before = await getPostRow(where);
  if (!before) throw new PostApiError('Post not found', 404);
  const structure = await getPostUrlStructure();
  const beforeSummary = toPostSummary(before, structure);

  const updateData: Record<string, unknown> = {};
  const text = (v: string | null | undefined) => (v == null ? null : v.trim() || null);

  if (input.title !== undefined) {
    if (!input.title?.trim()) throw new PostApiError('title cannot be empty');
    updateData.title = input.title.trim();
  }
  if (input.content !== undefined) updateData.content = input.content;
  if (input.excerpt !== undefined) updateData.excerpt = text(input.excerpt);
  if (input.featured_image_url !== undefined) updateData.featured_image_url = input.featured_image_url;
  if (input.featured_image_alt !== undefined) updateData.featured_image_alt = text(input.featured_image_alt);
  if (input.featured_image_credit !== undefined) updateData.featured_image_credit = text(input.featured_image_credit);
  if (input.og_title !== undefined) updateData.og_title = text(input.og_title);
  if (input.og_description !== undefined) updateData.og_description = text(input.og_description);
  if (input.og_image !== undefined) updateData.og_image = text(input.og_image);
  if (input.canonical_url !== undefined) updateData.canonical_url = text(input.canonical_url);
  if (input.schema_type !== undefined) updateData.schema_type = normaliseSchemaType(input.schema_type);
  if (input.is_featured !== undefined) updateData.is_featured = !!input.is_featured;

  if (input.author_id !== undefined || input.author_username !== undefined) {
    const author_id = await resolveAuthorId(input);
    if (!author_id) throw new PostApiError('author not found');
    updateData.author_id = author_id;
  }
  if (input.category_id !== undefined || input.category_slug !== undefined) {
    updateData.category_id = await resolveCategoryId(input);
  }

  if (input.slug) {
    const newSlug = slugify(input.slug);
    if (!newSlug) throw new PostApiError('Invalid slug');
    if (newSlug !== before.slug) {
      const { data: clash } = await db.from('posts').select('id').eq('slug', newSlug).maybeSingle();
      if (clash) throw new PostApiError(`Slug "${newSlug}" is already in use`, 409);
      updateData.slug = newSlug;
    }
  }

  if (input.status !== undefined) {
    updateData.status = input.status;
    if (input.status === 'published') {
      const content = input.content !== undefined ? input.content : before.content;
      if (!content?.trim()) throw new PostApiError('content is required to publish');
      updateData.published_at = input.published_at || before.published_at || new Date().toISOString();
    } else if (input.published_at !== undefined) {
      updateData.published_at = input.published_at;
    }
  } else if (input.published_at !== undefined) {
    updateData.published_at = input.published_at;
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updated_at = new Date().toISOString();
    const { error } = await db.from('posts').update(updateData).eq('id', before.id);
    if (error) throw new PostApiError(error.message, 500);
  }

  if (input.tags !== undefined && input.tags !== null) await syncPostTags(before.id, input.tags);

  const after = await getPostRow({ id: before.id });
  const summary = toPostSummary(after, structure);

  const oldCategorySlug = beforeSummary.category?.slug || 'uncategorized';
  const newCategorySlug = summary.category?.slug || 'uncategorized';
  const from = postPath(before.slug, oldCategorySlug, structure);
  const to = postPath(after.slug, newCategorySlug, structure);
  const moved = from !== to;

  // A published post that moved keeps its old URL working with a 301.
  if (after.status === 'published') {
    if (moved && before.status === 'published') {
      await recordMove({ from, to, note: `Auto-redirect (publishing API): "${from}" moved to "${to}"` });
    } else {
      await clearRedirectsFrom(to);
    }
  }

  // Revalidate old and new locations whenever either state was public.
  let revalidated: string[] = [];
  if (before.status === 'published' || after.status === 'published') {
    revalidated = revalidatePostPaths({
      slug: after.slug,
      oldSlug: before.slug !== after.slug ? before.slug : null,
      categorySlug: newCategorySlug,
      oldCategorySlug: oldCategorySlug !== newCategorySlug ? oldCategorySlug : null,
      structure,
    });
    if (after.status === 'published' && !summary.scheduled) {
      await pingIndexNow({ slug: after.slug, categorySlug: summary.category?.slug ?? null, structure });
    }
  }

  return { post: summary, created: false, revalidated };
}
