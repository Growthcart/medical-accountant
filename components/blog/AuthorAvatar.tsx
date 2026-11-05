'use client';

import { useEffect, useRef, useState } from 'react';

interface AuthorAvatarProps {
  src?: string | null;
  name: string;
  size: number;
  // Shape and any extra styling, applied to both the photo and the fallback.
  className?: string;
  // Extra styling for the initial shown when there is no usable photo.
  fallbackClassName?: string;
}

// Author photo for server-rendered pages. Cached article HTML can outlive the
// photo URL it was rendered with (e.g. an expired LinkedIn CDN link), so if the
// image fails to load we show the author's initial instead of a broken image.
export default function AuthorAvatar({
  src,
  name,
  size,
  className = 'rounded',
  fallbackClassName = 'bg-gray-200 text-gray-600',
}: AuthorAvatarProps) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // The image may already have failed before hydration attached onError.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);
  const style = { width: size, height: size };

  if (!src || failed) {
    return (
      <span
        style={{ ...style, fontSize: Math.max(10, Math.round(size * 0.4)) }}
        className={`inline-flex shrink-0 items-center justify-center font-semibold ${fallbackClassName} ${className}`}
        aria-hidden="true"
      >
        {(name || '?').charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt={name}
      width={size}
      height={size}
      style={style}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`shrink-0 object-cover ${className}`}
    />
  );
}
