import Image from 'next/image';

// Wrapper over next/image. Images are served unoptimised (see next.config.mjs),
// so any host works and nothing here depends on an allow-list.
type Common = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

// `fill`: the image covers its positioned parent (parent needs `relative`).
// Otherwise width/height give the intrinsic size used for the placeholder box.
type SiteImageProps = Common & ({ fill: true } | { fill?: false; width: number; height: number });

export default function SiteImage(props: SiteImageProps) {
  const { src, alt, sizes, className, priority } = props;
  return props.fill ? (
    <Image src={src} alt={alt} fill sizes={sizes} className={className} priority={priority} />
  ) : (
    <Image src={src} alt={alt} width={props.width} height={props.height} sizes={sizes} className={className} priority={priority} />
  );
}
