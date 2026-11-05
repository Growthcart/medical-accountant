'use client';
import { useEffect } from 'react';

// Loads one of the original vanilla-JS behaviour modules after hydration, so it
// never mutates the DOM before React has attached to it.
export default function Behavior({ src }) {
  useEffect(() => {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const s = document.createElement('script');
    s.type = 'module';
    s.src = src;
    document.body.appendChild(s);
  }, [src]);
  return null;
}
