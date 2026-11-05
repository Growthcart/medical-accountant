import { marked } from 'marked';
import type { DbClient } from '@/lib/db/server';
import { createServiceClient } from '@/lib/db/server';
import {
  createPost,
  getPostRow,
  listPostRows,
  PostApiError,
  toPostSummary,
  updatePost,
  type PostWriteInput,
} from '@/lib/posts-admin';
import { stripHtml } from '@/lib/blog/format';
import { assertPublicHost, DISCOVER_MIN_WIDTH, fetchImageBuffer, ImageError, processAndStorePostImage, readImageInfo } from '@/lib/images';
import { publicUrlFor } from '@/lib/storage/public-url';
import { isPublisher, type TokenContext } from './oauth';
import { getPostUrlStructure } from '@/lib/blog/postUrlStructure';

// Tools offered by the remote MCP endpoint (/api/mcp). Each runs as the
// signed-in MedicalAccountant.ie account; the shared publishing logic in
// lib/posts-admin.ts does the writing and cache refresh.

export interface McpToolDef {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, boolean>;
}

// Tool arguments arrive as untyped JSON from the MCP client.
type Args = Record<string, any>;

export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  const html = marked.parse(markdown, { async: false, gfm: true, breaks: false }) as string;
  // The article title is the page H1; demote any H1 in the body to H2.
  return html.replace(/<h1(\s[^>]*)?>/gi, '<h2$1>').replace(/<\/h1>/gi, '</h2>').trim();
}

function resolveContent(args: { content_markdown?: string; content_html?: string }): string | undefined {
  if (args.content_html) return args.content_html;
  if (args.content_markdown) return markdownToHtml(args.content_markdown);
  return undefined;
}

// Image hosts the site's Content-Security-Policy lets the browser load
// (next.config.mjs img-src). Images anywhere else will not display.
export function isDisplayableImageHost(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    return u.hostname === new URL(publicUrlFor('post-images', 'x')).hostname || u.hostname === 'images.unsplash.com';
  } catch {
    return false;
  }
}

// Width of a remote image, read from the first bytes of the file.
async function fetchImageWidth(url: string): Promise<{ width?: number; type?: string } | null> {
  try {
    await assertPublicHost(new URL(url));
    const res = await fetch(url, { headers: { Range: 'bytes=0-131071' }, redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    if (!res.ok && res.status !== 206) return null;
    const info = readImageInfo(new Uint8Array(await res.arrayBuffer()));
    if (info) return { width: info.width, type: info.type };
    return { type: 'unknown' };
  } catch {
    return null;
  }
}

export async function preflight(args: Args) {
  const html = resolveContent(args) || '';
  const text = stripHtml(html);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const issues: string[] = [];
  const warnings: string[] = [];
  const passes: string[] = [];

  const title: string = args.title || '';
  if (!title.trim()) issues.push('Title is missing.');
  else {
    if (title.length > 110) issues.push(`Title is ${title.length} characters; keep headlines under ~110.`);
    else if (title.length > 70) warnings.push(`Title is ${title.length} characters; under 70 shows fully in search results.`);
    else passes.push('Title length is good.');
    if (title === title.toUpperCase() && /[A-Z]/.test(title)) issues.push('Title is ALL CAPS (Discover treats this as clickbait).');
  }

  const excerpt: string = args.excerpt || '';
  if (!excerpt.trim()) warnings.push('No excerpt: add a 120-160 character summary for the meta description and standfirst.');
  else if (excerpt.length > 160) warnings.push(`Excerpt is ${excerpt.length} characters; keep under 160.`);
  else if (excerpt.length < 70) warnings.push(`Excerpt is only ${excerpt.length} characters; 120-160 is ideal.`);
  else passes.push('Excerpt length is good.');

  if (words === 0) issues.push('Body is empty.');
  else if (words < 300) warnings.push(`Body is ${words} words; aim for 600+ for a useful article.`);
  else passes.push(`Body has ${words} words.`);

  if (words > 400 && !/<h2[\s>]/i.test(html)) warnings.push('No H2 subheadings in a long article.');
  if (/<h1[\s>]/i.test(html)) warnings.push('Body contains an H1; the title is already the page H1.');
  if (!/<a\s/i.test(html) && words > 300) warnings.push('No links; add 2-4 internal links (service pages, related posts) and cite sources.');
  const inlineImages = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)).map((m) => m[1]);
  if (inlineImages.some((src) => !isDisplayableImageHost(src))) {
    warnings.push('Some inline images are on hosts the site blocks (only uploads from this site and Unsplash display). Re-host them with upload_image.');
  }
  if (/<img(?![^>]*\balt=)[^>]*>/i.test(html)) warnings.push('Inline images without alt text.');

  const featured: string | undefined = args.featured_image_url;
  if (!featured && !args.featured_image_source_url) {
    warnings.push('No featured image: the generated social card is used. A real photo at least 1200px wide performs far better.');
  } else if (featured) {
    if (!isDisplayableImageHost(featured)) {
      warnings.push('Featured image host is not allowed by the site; create_post/update_post will copy it onto the site automatically.');
    }
    const dims = await fetchImageWidth(featured);
    if (dims?.width && dims.width < DISCOVER_MIN_WIDTH) {
      issues.push(`Featured image is ${dims.width}px wide; Google Discover needs at least ${DISCOVER_MIN_WIDTH}px.`);
    } else if (dims?.width) {
      passes.push(`Featured image is ${dims.width}px wide (${dims.type}).`);
    }
  }
  if (featured && !args.featured_image_alt) warnings.push('No featured_image_alt: describe the image for accessibility and image search.');

  const tags: string[] | undefined = args.tags;
  if (!tags || tags.length === 0) warnings.push('No tags; add 2-5.');
  else if (tags.length > 8) warnings.push(`${tags.length} tags is a lot; keep to the 2-5 most relevant.`);

  return { ready: issues.length === 0, word_count: words, issues, warnings, passes };
}

function buildWritePayload(args: Args): Partial<PostWriteInput> {
  const payload: Partial<PostWriteInput> = {
    title: args.title,
    content: resolveContent(args),
    excerpt: args.excerpt,
    category_slug: args.category_slug,
    author_username: args.author_username,
    tags: args.tags,
    slug: args.slug,
    status: args.status,
    featured_image_url: args.featured_image_url,
    featured_image_alt: args.featured_image_alt,
    featured_image_credit: args.featured_image_credit,
    published_at: args.published_at,
    og_title: args.og_title,
    og_description: args.og_description,
    canonical_url: args.canonical_url,
    schema_type: args.schema_type,
    is_featured: args.is_featured,
  };
  (Object.keys(payload) as Array<keyof PostWriteInput>).forEach((k) => {
    if (payload[k] === undefined) delete payload[k];
  });
  return payload;
}

const postWriteProperties = {
  title: { type: 'string', description: 'Article headline (also the page H1).' },
  content_markdown: { type: 'string', description: 'Body in Markdown (GFM). Do not include the title; H1s are demoted to H2.' },
  content_html: { type: 'string', description: 'Body as HTML. Overrides content_markdown.' },
  excerpt: { type: 'string', description: '120-160 character summary: meta description and the standfirst under the title.' },
  category_slug: { type: 'string', description: 'Category slug from list_categories.' },
  author_username: { type: 'string', description: 'Author from list_authors (username or name). Only when the user asks for a specific author; leave it out to publish as the connected account (see whoami).' },
  tags: { type: 'array', items: { type: 'string' }, description: '2-5 topical tags. Replaces the existing tags on update.' },
  slug: { type: 'string', description: 'URL slug; derived from the title if omitted.' },
  status: { type: 'string', enum: ['draft', 'published'], description: 'Defaults to published on create.' },
  featured_image_url: { type: 'string', description: 'Image URL to use as the featured image (>= 1200px wide for Discover). Images not already on the site are copied onto it automatically.' },
  featured_image_source_url: { type: 'string', description: 'Public image URL to download and store on the site, then use as the featured image. Ignored if featured_image_url is given.' },
  featured_image_alt: { type: 'string', description: 'Alt text describing the featured image.' },
  featured_image_credit: { type: 'string', description: 'Credit line shown under the featured image.' },
  published_at: { type: 'string', description: 'ISO 8601 date; defaults to now. A future date schedules the post.' },
  og_title: { type: 'string', description: 'Social/SEO title override.' },
  og_description: { type: 'string', description: 'Social/SEO description override.' },
  canonical_url: { type: 'string', description: 'Canonical URL, only for posts first published elsewhere.' },
  schema_type: { type: 'string', enum: ['BlogPosting', 'Article', 'NewsArticle', 'TechArticle', 'HowTo'], description: 'Structured data type; defaults to BlogPosting.' },
  is_featured: { type: 'boolean', description: 'Show in the Featured strip on the blog.' },
} as const;

const idOrSlug = { slug: { type: 'string', description: 'Current slug of the post.' }, id: { type: 'string', description: 'Post id (alternative to slug).' } };

export const MCP_TOOLS: McpToolDef[] = [
  {
    name: 'whoami',
    title: 'Who am I',
    description: 'Show which MedicalAccountant.ie account this connection is signed in as. New posts are published under this account unless author_username is set.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'list_categories',
    title: 'List categories',
    description: 'List blog categories a post can be filed under (name, slug, description).',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'list_authors',
    title: 'List authors',
    description: 'List the accounts a post can be attributed to.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'list_posts',
    title: 'List posts',
    description: 'Search or page through posts (drafts and published). Returns summaries without the body.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Case-insensitive title search.' },
        status: { type: 'string', enum: ['draft', 'published'] },
        category_slug: { type: 'string' },
        author_username: { type: 'string' },
        limit: { type: 'number', description: '1-100, default 20.' },
        offset: { type: 'number' },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'get_post',
    title: 'Get post',
    description: 'Fetch one post by slug or id, including its HTML body.',
    inputSchema: { type: 'object', properties: idOrSlug },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'seo_preflight',
    title: 'SEO preflight',
    description: 'Check a draft against Google search and Discover guidelines (title, excerpt, length, headings, links, images, tags) before publishing.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        excerpt: { type: 'string' },
        content_markdown: { type: 'string' },
        content_html: { type: 'string' },
        featured_image_url: { type: 'string' },
        featured_image_alt: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['title'],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'markdown_to_html',
    title: 'Markdown to HTML',
    description: 'Preview the HTML the site will store for a Markdown body.',
    inputSchema: { type: 'object', properties: { content_markdown: { type: 'string' } }, required: ['content_markdown'] },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'upload_image',
    title: 'Upload image',
    description: 'Download an image from a public URL and store it on the site. Returns the stored URL (use it as featured_image_url or in the body) and whether it is wide enough for Google Discover. Files attached in the chat cannot be read; give a URL.',
    inputSchema: {
      type: 'object',
      properties: {
        source_url: { type: 'string', description: 'Public URL of the image.' },
        filename: { type: 'string', description: 'Optional name to store it under.' },
      },
      required: ['source_url'],
    },
  },
  {
    name: 'create_post',
    title: 'Create post',
    description: 'Create a blog post (published by default, or status "draft"). Runs the SEO preflight and refuses to publish on blocking issues unless skip_preflight is true. Publishing refreshes the article, blog listings, sitemaps and feeds.',
    inputSchema: {
      type: 'object',
      properties: { ...postWriteProperties, skip_preflight: { type: 'boolean', description: 'Publish even if the preflight reports blocking issues.' } },
      required: ['title'],
    },
  },
  {
    name: 'update_post',
    title: 'Update post',
    description: 'Update a post found by slug or id. Only the fields you pass change. Use new_slug to rename the URL (a 301 redirect from the old URL is created).',
    inputSchema: {
      type: 'object',
      properties: { ...postWriteProperties, ...idOrSlug, new_slug: { type: 'string' } },
    },
  },
  {
    name: 'publish_post',
    title: 'Publish post',
    description: 'Publish a draft (slug or id). Keeps its original date unless published_at is given.',
    inputSchema: { type: 'object', properties: { ...idOrSlug, published_at: { type: 'string' } } },
  },
  {
    name: 'unpublish_post',
    title: 'Unpublish post',
    description: 'Revert a published post to draft (slug or id). Its URL stops working and it leaves the blog, sitemaps and feeds.',
    inputSchema: { type: 'object', properties: idOrSlug },
    annotations: { destructiveHint: true },
  },
];

function textResult(payload: unknown, note?: string) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  return { content: [{ type: 'text', text: note ? `${note}\n\n${text}` : text }] };
}

function errorResult(message: string) {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

// Bring the featured image onto the site when it was given as a source URL,
// or as a URL on a host the site cannot display. Returns a note, if any.
async function importFeaturedImage(args: Args): Promise<string | null> {
  const source: string | undefined =
    args.featured_image_url && !isDisplayableImageHost(args.featured_image_url)
      ? args.featured_image_url
      : !args.featured_image_url
        ? args.featured_image_source_url
        : undefined;
  if (!source) return null;
  const buffer = await fetchImageBuffer(String(source));
  const name = new URL(String(source)).pathname.split('/').pop() || 'featured';
  const stored = await processAndStorePostImage({ buffer, filename: args.filename || name });
  args.featured_image_url = stored.url;
  return [`Featured image stored on the site: ${stored.url}.`, ...stored.warnings].join(' ');
}

function postNote(post: { url: string | null; status: string; slug: string; scheduled: boolean; author: { username: string | null; full_name: string | null } | null }, verb: string): string {
  const where = post.url
    ? `${post.scheduled ? 'Scheduled' : verb}: ${post.url}`
    : `Saved as ${post.status}: ${post.slug} (review it in the admin under Posts).`;
  const author = post.author ? ` Author: ${post.author.full_name || post.author.username}.` : '';
  return `${where}${author}`;
}

async function findPost(args: Args) {
  if (!args.slug && !args.id) throw new PostApiError('Provide slug or id');
  const row = await getPostRow({ id: args.id, slug: args.slug });
  if (!row) throw new PostApiError('Post not found', 404);
  return row;
}

// Execute a tool as the authenticated user.
export async function callMcpTool(name: string, rawArgs: unknown, ctx: TokenContext) {
  const args = { ...((rawArgs || {}) as Args) };
  if (!isPublisher(ctx.role)) {
    return errorResult('This account does not have publishing rights (admin required).');
  }

  try {
    switch (name) {
      case 'whoami': {
        const { data } = await createServiceClient().from('profiles').select('id, username, full_name, role').eq('id', ctx.userId).maybeSingle();
        return textResult(data || { id: ctx.userId, role: ctx.role });
      }
      case 'list_categories': {
        const { data } = await createServiceClient().from('categories').select('id, name, slug, description').order('name');
        return textResult(data || []);
      }
      case 'list_authors': {
        const { data } = await createServiceClient().from('profiles').select('id, username, full_name, role').eq('role', 'admin').order('full_name');
        return textResult(data || []);
      }
      case 'list_posts': {
        const structure = await getPostUrlStructure();
        const { rows, total } = await listPostRows({
          q: args.q,
          status: args.status,
          category_slug: args.category_slug,
          author_username: args.author_username,
          limit: args.limit,
          offset: args.offset,
        });
        return textResult({ total, posts: rows.map((r) => toPostSummary(r, structure)) });
      }
      case 'get_post':
        return textResult({ post: toPostSummary(await findPost(args), await getPostUrlStructure(), true) });
      case 'seo_preflight':
        return textResult(await preflight(args));
      case 'markdown_to_html':
        return textResult(markdownToHtml(args.content_markdown || ''));
      case 'upload_image': {
        if (!args.source_url) return errorResult('Provide source_url');
        const buffer = await fetchImageBuffer(String(args.source_url));
        const fallbackName = new URL(String(args.source_url)).pathname.split('/').pop() || 'image';
        const stored = await processAndStorePostImage({ buffer, filename: args.filename || fallbackName });
        return textResult(
          stored,
          stored.discover_ready
            ? `Stored and Discover-ready. Use this as featured_image_url: ${stored.url}`
            : `Stored with warnings. Use this as featured_image_url: ${stored.url}`,
        );
      }
      case 'create_post': {
        const imageNote = await importFeaturedImage(args);
        const payload = buildWritePayload(args) as PostWriteInput;
        // Posts belong to the connected account unless an author is named.
        if (!payload.author_username) payload.author_id = ctx.userId;
        if (!payload.content) return errorResult('Provide content_markdown or content_html');
        const check = await preflight(args);
        const publishing = (args.status ?? 'published') === 'published';
        if (publishing && !check.ready && !args.skip_preflight) {
          return textResult({ blocked: true, preflight: check }, 'Not published: fix the blocking issues, or pass skip_preflight: true.');
        }
        const result = await createPost(payload);
        return textResult({ post: result.post, preflight: check }, [postNote(result.post, 'Published'), imageNote].filter(Boolean).join(' '));
      }
      case 'update_post': {
        const existing = await findPost(args);
        const imageNote = await importFeaturedImage(args);
        const payload = buildWritePayload(args);
        // `slug` is the lookup key; only `new_slug` renames.
        delete payload.slug;
        if (args.new_slug) payload.slug = args.new_slug;
        const result = await updatePost({ id: existing.id }, payload);
        return textResult({ post: result.post }, [postNote(result.post, 'Updated'), imageNote].filter(Boolean).join(' '));
      }
      case 'publish_post': {
        const existing = await findPost(args);
        const result = await updatePost({ id: existing.id }, { status: 'published', published_at: args.published_at });
        return textResult({ post: result.post }, postNote(result.post, 'Published'));
      }
      case 'unpublish_post': {
        const existing = await findPost(args);
        const result = await updatePost({ id: existing.id }, { status: 'draft' });
        return textResult({ post: result.post }, `Unpublished: ${result.post.slug} is now a draft.`);
      }
      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof PostApiError || error instanceof ImageError) return errorResult(error.message);
    console.error(`[mcp] tool ${name} failed:`, error);
    return errorResult(error instanceof Error ? error.message : String(error));
  }
}
