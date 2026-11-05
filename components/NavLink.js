'use client';
import { usePathname } from 'next/navigation';

// A header link that marks itself as the current page (styled via [aria-current]).
export default function NavLink({ href, className, children }) {
  const path = usePathname() || '/';
  const current = href === '/' ? path === '/' : path.startsWith(href);
  return (
    <a href={href} className={className} aria-current={current ? 'page' : undefined}>
      {children}
    </a>
  );
}
