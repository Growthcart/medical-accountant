#!/usr/bin/env node
/**
 * MedicalAccountant.ie publishing MCP server.
 *
 * Exposes the site's publishing API (/api/posts/*) to Claude Code (or any MCP
 * client) over stdio so blog posts can be drafted, preflighted for search and
 * Google Discover, and published without leaving the editor.
 *
 * Configuration (environment variables):
 *   CMS_POSTS_API_KEY    required - the site's POSTS_API_KEY
 *   CMS_SITE_URL         optional - defaults to https://medicalaccountant.ie
 *   CMS_DEFAULT_AUTHOR   optional - username (or name) used when a call omits author_username
 *   CMS_DEFAULT_CATEGORY optional - category slug used when a call omits category_slug
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { marked } from 'marked';
import { imageSize } from 'image-size';

const SITE_URL = (process.env.CMS_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const API_KEY = process.env.CMS_POSTS_API_KEY || '';
const DEFAULT_AUTHOR = process.env.CMS_DEFAULT_AUTHOR || undefined;
const DEFAULT_CATEGORY = process.env.CMS_DEFAULT_CATEGORY || undefined;

const DISCOVER_MIN_IMAGE_WIDTH = 1200;
// Hosts the site's Content-Security-Policy lets browsers load images from.
const DISPLAYABLE_IMAGE_HOSTS = [
  new RegExp('^' + new URL(SITE_URL).hostname.replace(/\./g, '\\.') + '$'),
  /^images\.unsplash\.com$/,
];

marked.setOptions({ gfm: true, breaks: false });

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function api(pathname, { method = 'GET', body, query } = {}) {
  if (!API_KEY) {
    throw new Error('CMS_POSTS_API_KEY is not set. Add it to your shell environment (see mcp-server/README.md).');
  }
  const url = new URL(pathname, SITE_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const response = await fetch(url, {
    method,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Unexpected non-JSON response (${response.status}) from ${url.pathname}: ${text.slice(0, 200)}`);
  }
  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }
  return data;
}

function ok(payload, extraText) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  return { content: [{ type: 'text', text: extraText ? `${extraText}\n\n${text}` : text }] };
}

function fail(error) {
  return {
    isError: true,
    content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
  };
}

async function run(fn) {
  try {
    return await fn();
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Content helpers
// ---------------------------------------------------------------------------

function markdownToHtml(markdown) {
  if (!markdown) return '';
  const html = marked.parse(markdown, { async: false });
  // The article title is the page H1; demote any H1 in the body to H2.
  return html.replace(/<h1(\s[^>]*)?>/gi, '<h2$1>').replace(/<\/h1>/gi, '</h2>').trim();
}

function resolveContent({ content_markdown, content_html }) {
  if (content_html) return content_html;
  if (content_markdown) return markdownToHtml(content_markdown);
  return undefined;
}

function stripTags(html) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function isDisplayableImageHost(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && DISPLAYABLE_IMAGE_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

async function fetchImageDimensions(url) {
  const response = await fetch(url, { headers: { Range: 'bytes=0-262143' } });
  if (!response.ok && response.status !== 206) throw new Error(`Image request failed (${response.status})`);
  const size = imageSize(Buffer.from(await response.arrayBuffer()));
  return { width: size.width, height: size.height, type: size.type };
}

// ---------------------------------------------------------------------------
// Preflight (SEO / Discover readiness). Runs locally; the only network call
// is the optional featured-image size check.
// ---------------------------------------------------------------------------

async function preflight({ title, excerpt, content_markdown, content_html, featured_image_url, featured_image_alt, tags }) {
  const html = resolveContent({ content_markdown, content_html }) || '';
  const text = stripTags(html);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const issues = [];
  const warnings = [];
  const passes = [];

  if (!title || !title.trim()) issues.push('Title is missing.');
  else {
    if (title.length > 110) issues.push(`Title is ${title.length} characters; keep headlines under ~110.`);
    else if (title.length > 70) warnings.push(`Title is ${title.length} characters; under 70 shows fully in search results.`);
    else passes.push('Title length is good.');
    if (title === title.toUpperCase() && /[A-Z]/.test(title)) issues.push('Title is ALL CAPS, which Discover treats as clickbait.');
    if (/!{2,}|\?{2,}/.test(title)) warnings.push('Title uses repeated punctuation; avoid clickbait signals.');
  }

  if (!excerpt || !excerpt.trim()) warnings.push('No excerpt: add a 120-160 character summary (meta description and standfirst).');
  else if (excerpt.length > 160) warnings.push(`Excerpt is ${excerpt.length} characters; keep it under 160.`);
  else if (excerpt.length < 70) warnings.push(`Excerpt is only ${excerpt.length} characters; 120-160 is ideal.`);
  else passes.push('Excerpt length is good.');

  if (words === 0) issues.push('Body is empty.');
  else if (words < 300) warnings.push(`Body is ${words} words; aim for 600+ for a useful article.`);
  else passes.push(`Body has ${words} words.`);
  if (words > 400 && !/<h2[\s>]/i.test(html)) warnings.push('No H2 subheadings; structure long articles with H2s.');
  if (/<h1[\s>]/i.test(html)) warnings.push('Body contains an H1; the title is already the page H1.');
  if (!/<a\s/i.test(html) && words > 300) warnings.push('No links; add 2-4 internal links (service pages, related posts) and cite sources.');
  const inlineImages = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
  if (inlineImages.some((src) => !isDisplayableImageHost(src))) {
    warnings.push('Some inline images are on hosts the site blocks; re-host them with upload_image.');
  }
  if (/<img(?![^>]*\balt=)[^>]*>/i.test(html)) warnings.push('Inline images without alt text.');

  if (!featured_image_url) {
    warnings.push('No featured image: the generated social card is used. A real photo at least 1200px wide performs far better.');
  } else {
    if (!isDisplayableImageHost(featured_image_url)) {
      issues.push('Featured image is not on the site, so it will not display. Run upload_image and use the returned URL.');
    }
    try {
      const dims = await fetchImageDimensions(featured_image_url);
      if (dims.width && dims.width < DISCOVER_MIN_IMAGE_WIDTH) {
        issues.push(`Featured image is ${dims.width}x${dims.height}; Google Discover needs at least ${DISCOVER_MIN_IMAGE_WIDTH}px wide.`);
      } else if (dims.width) {
        passes.push(`Featured image is ${dims.width}x${dims.height} (${dims.type}).`);
      }
      if (dims.type === 'svg') issues.push('Featured image is SVG, which Google Images does not index.');
    } catch (error) {
      warnings.push(`Could not read featured image dimensions: ${error.message}`);
    }
    if (!featured_image_alt) warnings.push('No featured_image_alt: describe the image for accessibility and image search.');
  }

  if (!tags || tags.length === 0) warnings.push('No tags; add 2-5.');
  else if (tags.length > 8) warnings.push(`${tags.length} tags is a lot; keep to the 2-5 most relevant.`);

  return { ready: issues.length === 0, word_count: words, issues, warnings, passes };
}

// ---------------------------------------------------------------------------
// Server + tools
// ---------------------------------------------------------------------------

const server = new McpServer(
  { name: 'cms-publisher', version: '1.0.0' },
  {
    instructions: [
      'Tools for publishing to the medicalaccountant.ie blog. Typical flow:',
      '1. list_categories to pick a valid category slug. Leave author_username out (it defaults to CMS_DEFAULT_AUTHOR) unless the user names an author; then use list_authors.',
      '2. Write the article in Markdown (no H1 in the body; the title is the H1).',
      '3. upload_image for the featured image (needs >= 1200px wide for Google Discover).',
      '4. seo_preflight to check title/excerpt/body/image before publishing.',
      '5. create_post with status "draft" to review it in the admin, then publish_post; or publish directly.',
      'Every publish/update refreshes the article, blog listings, sitemaps and feeds.',
    ].join('\n'),
  },
);

const postFieldsShape = {
  title: z.string().min(1).describe('Article headline (also the H1).'),
  content_markdown: z.string().optional().describe('Body in Markdown (GFM). Converted to HTML; H1s are demoted to H2.'),
  content_html: z.string().optional().describe('Body as ready HTML. Overrides content_markdown.'),
  excerpt: z.string().optional().describe('120-160 character summary used as meta description and standfirst.'),
  category_slug: z.string().optional().describe('Category slug from list_categories. Defaults to CMS_DEFAULT_CATEGORY.'),
  author_username: z.string().optional().describe('Author from list_authors (username or name). Defaults to CMS_DEFAULT_AUTHOR.'),
  tags: z.array(z.string()).optional().describe('2-5 topical tags.'),
  slug: z.string().optional().describe('URL slug. Derived from the title when omitted.'),
  status: z.enum(['draft', 'published']).optional().describe('Defaults to published.'),
  featured_image_url: z.string().url().optional().describe('Featured image URL on the site (use upload_image first).'),
  featured_image_alt: z.string().optional().describe('Alt text for the featured image.'),
  featured_image_credit: z.string().optional().describe('Credit line shown under the image.'),
  published_at: z.string().optional().describe('ISO 8601 publish date. Defaults to now; a future date schedules the post.'),
  og_title: z.string().optional().describe('Social/SEO title override.'),
  og_description: z.string().optional().describe('Social/SEO description override.'),
  canonical_url: z.string().url().optional().describe('Canonical URL, only for posts first published elsewhere.'),
  schema_type: z.enum(['BlogPosting', 'Article', 'NewsArticle', 'TechArticle', 'HowTo']).optional().describe('Structured data type; defaults to BlogPosting.'),
  is_featured: z.boolean().optional().describe('Show in the Featured strip on the blog.'),
  skip_preflight: z.boolean().optional().describe('Publish even if seo_preflight reports blocking issues.'),
};

function buildWritePayload(args) {
  const payload = {
    title: args.title,
    content: resolveContent(args),
    excerpt: args.excerpt,
    category_slug: args.category_slug ?? DEFAULT_CATEGORY,
    author_username: args.author_username ?? DEFAULT_AUTHOR,
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
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key];
  }
  return payload;
}

function postNote(post, verb) {
  if (!post) return '';
  if (post.url) return `${post.scheduled ? 'Scheduled' : verb}: ${post.url}`;
  return `Saved as ${post.status}: ${post.slug} (review it in the admin under Posts).`;
}

server.registerTool(
  'list_categories',
  {
    title: 'List categories',
    description: 'Blog categories a post can be filed under (slug, name, description).',
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => run(async () => ok((await api('/api/posts/create')).categories)),
);

server.registerTool(
  'list_authors',
  {
    title: 'List authors',
    description: 'Accounts a post can be attributed to.',
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => run(async () => ok((await api('/api/posts/create')).authors)),
);

server.registerTool(
  'whoami',
  {
    title: 'Who am I',
    description: 'Report the target site and the account posts are published as. The stdio server authenticates with the site API key, so it shows the configured default author (who a post is attributed to when author_username is omitted) and default category.',
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => run(async () => {
    const { authors = [], categories = [] } = await api('/api/posts/create');
    const match = (list, needle) =>
      needle
        ? list.find((a) => a.username === needle || a.full_name === needle || a.name === needle) || null
        : null;
    const defaultAuthor = match(authors, DEFAULT_AUTHOR);
    return ok({
      site_url: SITE_URL,
      api_key_configured: Boolean(API_KEY),
      default_author: defaultAuthor || DEFAULT_AUTHOR || null,
      default_category: DEFAULT_CATEGORY || null,
      authors_available: authors.length,
      categories_available: categories.length,
    });
  }),
);

server.registerTool(
  'list_posts',
  {
    title: 'List posts',
    description: 'Search or page through posts (drafts and published). Returns summaries without body content.',
    inputSchema: {
      q: z.string().optional().describe('Case-insensitive title search.'),
      status: z.enum(['draft', 'published']).optional(),
      category_slug: z.string().optional(),
      author_username: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => run(async () => ok(await api('/api/posts/lookup', { query: args }))),
);

server.registerTool(
  'get_post',
  {
    title: 'Get post',
    description: 'Fetch one post by slug or id, including its HTML body.',
    inputSchema: { slug: z.string().optional(), id: z.string().optional() },
    annotations: { readOnlyHint: true },
  },
  async ({ slug, id }) => run(async () => {
    if (!slug && !id) throw new Error('Provide slug or id');
    return ok(await api('/api/posts/lookup', { query: { slug, id } }));
  }),
);

server.registerTool(
  'seo_preflight',
  {
    title: 'SEO preflight',
    description: 'Check a draft against Google search and Discover guidelines (title, excerpt, body length and structure, links, images, tags). Run before publishing.',
    inputSchema: {
      title: z.string(),
      excerpt: z.string().optional(),
      content_markdown: z.string().optional(),
      content_html: z.string().optional(),
      featured_image_url: z.string().url().optional(),
      featured_image_alt: z.string().optional(),
      tags: z.array(z.string()).optional(),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => run(async () => ok(await preflight(args))),
);

server.registerTool(
  'upload_image',
  {
    title: 'Upload image',
    description: 'Upload a featured or inline image from a local file path or a remote URL. Stores it on the site and returns the public URL plus Discover readiness (>= 1200px wide).',
    inputSchema: {
      file_path: z.string().optional().describe('Absolute or cwd-relative path to a local image file.'),
      source_url: z.string().url().optional().describe('Remote image URL to import instead of a local file.'),
      filename: z.string().optional().describe('Name to store the image under (defaults to the source name).'),
    },
  },
  async ({ file_path, source_url, filename }) => run(async () => {
    let body;
    if (file_path) {
      const resolved = path.resolve(file_path);
      const buffer = await fs.readFile(resolved);
      body = { filename: filename || path.basename(resolved), content_base64: buffer.toString('base64') };
    } else if (source_url) {
      // The site downloads the image itself (with SSRF checks).
      body = { source_url, filename };
    } else {
      throw new Error('Provide file_path or source_url');
    }
    const data = await api('/api/posts/upload-image', { method: 'POST', body });
    return ok(data, data.discover_ready ? `Image uploaded and Discover-ready: ${data.url}` : `Image uploaded with warnings: ${data.url}`);
  }),
);

server.registerTool(
  'create_post',
  {
    title: 'Create post',
    description: 'Create a new blog post (published by default, or status "draft"). Runs seo_preflight first and refuses to publish on blocking issues unless skip_preflight is true. The article, blog listings, sitemaps and feeds are refreshed automatically.',
    inputSchema: postFieldsShape,
  },
  async (args) => run(async () => {
    const payload = buildWritePayload(args);
    if (!payload.content) throw new Error('Provide content_markdown or content_html');
    const check = await preflight(args);
    const publishing = (args.status ?? 'published') === 'published';
    if (publishing && !check.ready && !args.skip_preflight) {
      return ok({ blocked: true, preflight: check }, 'Not published: fix the blocking issues or pass skip_preflight: true.');
    }
    const data = await api('/api/posts/create', { method: 'POST', body: payload });
    return ok({ ...data, preflight: check }, postNote(data.post, 'Published'));
  }),
);

server.registerTool(
  'update_post',
  {
    title: 'Update post',
    description: 'Update an existing post found by its current slug or id. Only the fields you pass change. Use new_slug to rename the URL (a 301 redirect from the old URL is created automatically).',
    inputSchema: {
      slug: z.string().optional().describe('Current slug of the post to update.'),
      id: z.string().optional().describe('Post id (alternative to slug).'),
      new_slug: z.string().optional(),
      ...Object.fromEntries(
        Object.entries(postFieldsShape)
          .filter(([k]) => !['slug', 'skip_preflight'].includes(k))
          .map(([k, v]) => [k, k === 'title' ? z.string().min(1).optional() : v]),
      ),
    },
  },
  async ({ slug, id, new_slug, ...rest }) => run(async () => {
    if (!slug && !id) throw new Error('Provide slug or id of the post to update');
    const payload = buildWritePayload(rest);
    if (payload.title === undefined) delete payload.title;
    // Do not silently re-point author/category to env defaults on partial updates.
    if (rest.author_username === undefined) delete payload.author_username;
    if (rest.category_slug === undefined) delete payload.category_slug;
    const data = await api('/api/posts/create', {
      method: 'POST',
      body: { ...payload, update_existing: true, id, slug, new_slug },
    });
    return ok(data, postNote(data.post, 'Updated'));
  }),
);

server.registerTool(
  'publish_post',
  {
    title: 'Publish post',
    description: 'Publish a draft. Keeps its original date unless published_at is given.',
    inputSchema: { slug: z.string().optional(), id: z.string().optional(), published_at: z.string().optional() },
  },
  async ({ slug, id, published_at }) => run(async () => {
    if (!slug && !id) throw new Error('Provide slug or id');
    const data = await api('/api/posts/create', {
      method: 'POST',
      body: { update_existing: true, id, slug, status: 'published', published_at },
    });
    return ok(data, postNote(data.post, 'Published'));
  }),
);

server.registerTool(
  'unpublish_post',
  {
    title: 'Unpublish post',
    description: 'Revert a published post to draft. Its URL stops working and it leaves the blog, sitemaps and feeds.',
    inputSchema: { slug: z.string().optional(), id: z.string().optional() },
    annotations: { destructiveHint: true },
  },
  async ({ slug, id }) => run(async () => {
    if (!slug && !id) throw new Error('Provide slug or id');
    const data = await api('/api/posts/create', {
      method: 'POST',
      body: { update_existing: true, id, slug, status: 'draft' },
    });
    return ok(data, `Unpublished: ${data.post?.slug} is now a draft.`);
  }),
);

server.registerTool(
  'markdown_to_html',
  {
    title: 'Markdown to HTML',
    description: 'Preview the HTML the site will store for a Markdown body (H1s demoted to H2).',
    inputSchema: { content_markdown: z.string() },
    annotations: { readOnlyHint: true },
  },
  async ({ content_markdown }) => ok(markdownToHtml(content_markdown)),
);

const transport = new StdioServerTransport();
await server.connect(transport);
