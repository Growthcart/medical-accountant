import { extractFaqFromContent, faqAlreadyVisible } from '@/lib/blog/faq';

// Visible "Frequently asked questions" section built from the FAQPage
// structured data embedded in an article, so the markup describes content
// readers can actually see. Renders nothing if the article has no FAQ data or
// already shows the questions itself.
export default function PostFaq({ content }: { content: string | null | undefined }) {
  const items = extractFaqFromContent(content);
  if (items.length === 0 || faqAlreadyVisible(content, items)) return null;

  return (
    <section className="entry-content mt-10" aria-labelledby="post-faq-heading">
      <h2 id="post-faq-heading">Frequently asked questions</h2>
      {items.map((item, i) => (
        <div key={i}>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </div>
      ))}
    </section>
  );
}
