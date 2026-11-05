import { pageGraph } from '@/lib/schema';

// Server-rendered JSON-LD. "<" is escaped so no text value can close the script tag.
export default function JsonLd(props) {
  const json = JSON.stringify(pageGraph(props)).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
