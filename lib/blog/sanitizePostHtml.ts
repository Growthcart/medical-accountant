import { FilterXSS, getDefaultWhiteList } from 'xss';

// Sanitises admin/MCP-authored post HTML before it is rendered with
// dangerouslySetInnerHTML. Runs on the server for the public post page (and in
// the browser for the admin preview, so both show the same markup). xss is
// pure JavaScript, so it works on Workers where a DOM-based sanitiser cannot.
//
// On top of the library's default allow-list this:
//   - allows the elements the editor and imported articles use (figure,
//     tables, details, media, inline SVG drawing elements);
//   - strips <style>, <script>, SVG <use>/<foreignObject>/animation elements;
//   - allows <iframe> only over https from IFRAME_HOSTS, removing any iframe
//     whose src is missing, relative, non-https or on another host.

// Keep in step with frame-src in the Content-Security-Policy (next.config.mjs):
// a host listed here but missing from the CSP would still be blocked.
const IFRAME_HOSTS = new Set(['www.youtube.com']);

function siteHost(): string | null {
  try {
    return process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname : null;
  } catch {
    return null;
  }
}

export function isAllowedIframeSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  let url: URL;
  try {
    url = new URL(src.trim());
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  return IFRAME_HOSTS.has(url.hostname) || url.hostname === siteHost();
}

const COMMON = ['class', 'id', 'title', 'lang', 'dir', 'aria-label', 'aria-hidden', 'role'];
const SVG_ATTRS = [...COMMON, 'viewbox', 'xmlns', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'transform', 'opacity', 'offset', 'stop-color'];

const whiteList: Record<string, string[]> = Object.fromEntries(
  Object.entries(getDefaultWhiteList()).map(([tag, attrs]) => [tag, attrs ?? []]),
);
for (const tag of Object.keys(whiteList)) whiteList[tag] = [...new Set([...whiteList[tag], ...COMMON])];
Object.assign(whiteList, {
  a: [...whiteList.a, 'rel'],
  img: [...whiteList.img, 'loading', 'width', 'height', 'srcset', 'sizes'],
  figure: COMMON,
  figcaption: COMMON,
  details: [...COMMON, 'open'],
  summary: COMMON,
  mark: COMMON,
  section: COMMON,
  article: COMMON,
  aside: COMMON,
  picture: COMMON,
  source: [...COMMON, 'src', 'srcset', 'type', 'media', 'sizes'],
  video: [...COMMON, 'src', 'controls', 'poster', 'width', 'height', 'preload'],
  audio: [...COMMON, 'src', 'controls', 'preload'],
  iframe: [...COMMON, 'src', 'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'width', 'height', 'loading'],
  svg: SVG_ATTRS,
  g: SVG_ATTRS,
  path: SVG_ATTRS,
  circle: SVG_ATTRS,
  rect: SVG_ATTRS,
  ellipse: SVG_ATTRS,
  line: SVG_ATTRS,
  polyline: SVG_ATTRS,
  polygon: SVG_ATTRS,
  text: SVG_ATTRS,
  lineargradient: SVG_ATTRS,
  stop: SVG_ATTRS,
  defs: SVG_ATTRS,
});

const filter = new FilterXSS({
  whiteList,
  // Drop the contents of these elements along with the tags.
  stripIgnoreTagBody: ['script', 'style', 'use', 'foreignobject', 'animate', 'animatemotion', 'animatetransform', 'set', 'feimage'],
  // Unknown tags are removed (their text stays).
  onIgnoreTag: () => '',
  onTag(tag, html, options) {
    if (tag === 'iframe' && !options.isClosing) {
      const src = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(html);
      if (!isAllowedIframeSrc(src?.[1] ?? src?.[2] ?? src?.[3])) return '';
    }
    return undefined;
  },
});

export function sanitizePostHtml(html: string | null | undefined): string {
  return html ? filter.process(html) : '';
}

const inlineFilter = new FilterXSS({
  whiteList: { a: ['href', 'target', 'rel'], em: [], strong: [], b: [], i: [] },
  stripIgnoreTagBody: ['script', 'style'],
  onIgnoreTag: () => '',
});

/** Links and emphasis only: for short credits and captions. */
export function sanitizeInlineHtml(html: string | null | undefined): string {
  return html ? inlineFilter.process(html) : '';
}
