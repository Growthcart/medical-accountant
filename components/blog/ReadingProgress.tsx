'use client';

import { useEffect, useRef } from 'react';

// Reading progress bar. Updated at most once per animation frame from a
// passive scroll listener, and drawn with transform: scaleX() rather than
// width so scrolling never triggers layout or React re-renders.
export default function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const bar = barRef.current;
      if (!bar) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollable = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, scrollTop / scrollable)) : 0;
      bar.style.transform = `scaleX(${ratio})`;
      bar.style.opacity = ratio > 0 ? '1' : '0';
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={barRef}
      className="fixed left-0 right-0 top-0 z-[60] h-1 origin-left transition-transform duration-150"
      style={{ transform: 'scaleX(0)', opacity: 0, backgroundColor: 'var(--accent-primary)' }}
    />
  );
}
