// Authors embed FAQPage JSON-LD in article bodies. Google requires structured
// data to describe content readers can see, so these helpers pull the Q&As out
// of the body to render them as a visible FAQ section when the article text
// does not already show them.

export interface FaqItem {
  question: string;
  answer: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
}

function plainText(s: unknown): string {
  return decodeEntities(String(s ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function faqEntities(node: unknown): unknown[] {
  if (Array.isArray(node)) return node.flatMap(faqEntities);
  if (!node || typeof node !== 'object') return [];
  const obj = node as Record<string, unknown>;
  const type = obj['@type'];
  const isFaq = type === 'FAQPage' || (Array.isArray(type) && type.includes('FAQPage'));
  if (isFaq) return [obj];
  return obj['@graph'] ? faqEntities(obj['@graph']) : [];
}

// Q&As from every FAQPage JSON-LD block inside the article HTML.
export function extractFaqFromContent(html: string | null | undefined): FaqItem[] {
  if (!html) return [];
  const items: FaqItem[] = [];
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, json] of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(decodeEntities(json));
    } catch {
      continue;
    }
    for (const faq of faqEntities(data) as Array<Record<string, any>>) {
      const entries = Array.isArray(faq.mainEntity) ? faq.mainEntity : [faq.mainEntity];
      for (const q of entries) {
        const question = plainText(q?.name);
        const answer = plainText(Array.isArray(q?.acceptedAnswer) ? q.acceptedAnswer[0]?.text : q?.acceptedAnswer?.text);
        if (question && answer) items.push({ question, answer });
      }
    }
  }
  return items;
}

// True when most of the questions already appear in the article's visible
// text (the author wrote an FAQ section), so it should not be shown twice.
export function faqAlreadyVisible(html: string | null | undefined, items: FaqItem[]): boolean {
  if (!html || items.length === 0) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const visible = norm(plainText(html.replace(/<script[\s\S]*?<\/script>/gi, ' ')));
  const shown = items.filter((i) => visible.includes(norm(i.question).slice(0, 60))).length;
  return shown >= Math.ceil(items.length / 2);
}
