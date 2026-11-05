import { revalidatePath } from 'next/cache';
import type { DbClient } from '@/lib/db/server';
import { createServiceClient } from '@/lib/db/server';
import { pingIndexNow, revalidatePostPaths } from './revalidate';
import { clearRedirectsFrom, recordMove } from './redirects';
import { postPath } from '@/lib/blog/postUrl';
import { getPostUrlStructure } from '@/lib/blog/postUrlStructure';

// Server-side follow-up after a post or category is changed outside
// lib/posts-admin.ts (the admin editor writes to the database from the browser,
// then calls /api/revalidate, which lands here). Reads the post's current
// state from the database so the caller cannot point redirects or cache
// refreshes at the wrong pages.

export interface PreviousPostState {
  slug?: string | null;
  categorySlug?: string | null;
  status?: string | null;
}

function first<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// A post was created, edited, published, unpublished or deleted.
export async function applyPostChange(input: {
  postId?: string | null;
  previous?: PreviousPostState | null;
  createdBy?: string | null;
}): Promise<string[]> {
  const previous = input.previous || {};
  let current: { slug: string; categorySlug: string; status: string; publishedAt: string | null } | null = null;

  if (input.postId) {
    const { data } = await createServiceClient()
      .from('posts')
      .select('slug, status, published_at, categories(slug)')
      .eq('id', input.postId)
      .maybeSingle();
    if (data) {
      current = {
        slug: data.slug,
        categorySlug: first<{ slug: string }>(data.categories as never)?.slug || 'uncategorized',
        status: data.status,
        publishedAt: data.published_at,
      };
    }
  }

  const structure = await getPostUrlStructure();
  const oldCategory = previous.categorySlug || 'uncategorized';
  if (current?.status === 'published') {
    const to = postPath(current.slug, current.categorySlug, structure);
    const from = previous.slug ? postPath(previous.slug, oldCategory, structure) : null;
    if (from && from !== to && previous.status === 'published') {
      await recordMove({ from, to, note: `Auto-redirect: post moved from "${from}" to "${to}"`, createdBy: input.createdBy });
    } else {
      await clearRedirectsFrom(to);
    }
  }

  const paths = revalidatePostPaths({
    slug: current?.slug ?? previous.slug,
    oldSlug: previous.slug && previous.slug !== current?.slug ? previous.slug : null,
    categorySlug: current?.categorySlug ?? oldCategory,
    oldCategorySlug: current && previous.categorySlug !== undefined && oldCategory !== current.categorySlug ? oldCategory : null,
    structure,
  });

  const live = current?.status === 'published' && (!current.publishedAt || new Date(current.publishedAt).getTime() <= Date.now());
  if (current && live) await pingIndexNow({ slug: current.slug, categorySlug: current.categorySlug, structure });
  return paths;
}

// A category was edited. Its name appears on every post in it; if its slug
// changed, every published post in it moved, and so did its archive, so 301s
// are added for all of them. Refreshes the whole site cache either way (post
// URLs and category names appear on many pages).
export async function applyCategoryRename(input: { categoryId: string; oldSlug: string; newSlug: string; createdBy?: string | null }): Promise<string[]> {
  if (input.oldSlug === input.newSlug) {
    revalidatePath('/', 'layout');
    return ['/**'];
  }
  const { data } = await createServiceClient()
    .from('posts')
    .select('slug')
    .eq('category_id', input.categoryId)
    .eq('status', 'published');
  const note = `Auto-redirect: category "${input.oldSlug}" renamed to "${input.newSlug}"`;
  const structure = await getPostUrlStructure();
  if (structure === 'category') {
    for (const post of (data || []) as Array<{ slug: string }>) {
      await recordMove({ from: postPath(post.slug, input.oldSlug, structure), to: postPath(post.slug, input.newSlug, structure), note, createdBy: input.createdBy });
    }
  }
  await recordMove({ from: `/news/category/${input.oldSlug}`, to: `/news/category/${input.newSlug}`, note, createdBy: input.createdBy });
  revalidatePath('/', 'layout');
  return ['/**'];
}
