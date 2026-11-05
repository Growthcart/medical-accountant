import { fmtDate } from '@/lib/site';

export default function PostCard({ post, delay = '' }) {
  return (
    <li className={`reveal ${delay}`}>
      <a href={`/${post.slug}/`} className="group block">
        <article className="flex h-full flex-col">
          <div className="mb-5 overflow-hidden rounded-2xl">
            <img src={post.image} alt={post.imageAlt || post.title} width="800" height="450" loading="lazy" decoding="async" className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-navy/55">
            <time dateTime={post.date}>{fmtDate(post.date)}</time>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>News</span>
          </p>
          <h3 className="post-card__title transition-colors group-hover:text-gold-700">{post.title}</h3>
          <p className="mt-3 flex-1 leading-relaxed text-navy/70">{post.description}</p>
          <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-navy group-hover:text-gold-700">
            Read article <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
          </p>
        </article>
      </a>
    </li>
  );
}
