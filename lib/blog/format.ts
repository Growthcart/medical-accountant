// Small formatting helpers shared by the blog post and archive pages.

// Brand accent used for category labels, links and highlights on blog pages.
export const BLOG_ACCENT = '#ff642d';

// To-one joins can arrive as either an object or a one-item array.
export function firstJoined<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function stripHtml(s: unknown): string {
  return String(s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// Plain text for a title or excerpt that may hold stray tags or entities.
export function plain(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .trim();
}

// Estimated reading time at ~220 words a minute.
export function readMinutes(html: string | null | undefined): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

// The post's own excerpt, or the first slice of its body when it has none.
export function summaryFor(p: { excerpt?: string | null; content?: string | null }): string | null {
  const ex = plain(p.excerpt);
  if (ex) return ex;
  const body = stripHtml(p.content);
  if (!body) return null;
  return body.length > 180 ? `${body.slice(0, 180).trimEnd()}…` : body;
}

// Cuts plain text to at most `max` characters at the last full sentence (or
// else the last whole word). No ellipsis is added: meta descriptions are never
// padded with "..." or "…".
export function clipDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  if (sentenceEnd > max * 0.5) return cut.slice(0, sentenceEnd + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–—-]+$/, '');
}

// Meta description fallback for a post with no excerpt: the opening of the
// body, cut cleanly by clipDescription.
export function descriptionFromBody(html: string | null | undefined, max = 160): string {
  return clipDescription(stripHtml(html), max);
}

export function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

export function timeAgo(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatShortDate(dateString);
}

export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/London',
  });
}

// "11 October 2026, 9:05 am". A fixed timezone keeps the server-rendered
// date identical to what the browser would print.
export function formatPublishedDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Europe/London',
  });
}
