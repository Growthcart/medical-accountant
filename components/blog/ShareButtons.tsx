// Share links for a post (LinkedIn, X, Facebook, email). Used in the post
// sidebar and above the author box at the end of the article.

export default function ShareButtons({
  title,
  postUrl,
  variant = 'card',
}: {
  title: string;
  postUrl: string;
  variant?: 'card' | 'inline';
}) {
  const encodedUrl = encodeURIComponent(postUrl);
  const encodedTitle = encodeURIComponent(title);
  const icons = (
    <div className="flex items-center gap-2.5">
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100/80 text-gray-600 transition-all duration-200 hover:bg-[#0077b5] hover:text-white hover:shadow-sm hover:-translate-y-0.5"
        aria-label="Share on LinkedIn"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100/80 text-gray-600 transition-all duration-200 hover:bg-black hover:text-white hover:shadow-sm hover:-translate-y-0.5"
        aria-label="Share on X"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100/80 text-gray-600 transition-all duration-200 hover:bg-[#1877f2] hover:text-white hover:shadow-sm hover:-translate-y-0.5"
        aria-label="Share on Facebook"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      </a>
      <a
        href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100/80 text-gray-600 transition-all duration-200 hover:bg-gray-800 hover:text-white hover:shadow-sm hover:-translate-y-0.5"
        aria-label="Share via Email"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
      </a>
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-900">Share story</span>
        {icons}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">Share this post</h4>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Social</span>
      </div>
      {icons}
    </div>
  );
}
