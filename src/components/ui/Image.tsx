import React from 'react';
import { cn } from '@/lib/utils';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  srcSet?: string;
  sizes?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
  priority?: boolean;
  showSkeleton?: boolean;
  modernFormats?: boolean;
}

function getModernFormatSource(src: string, targetExt: 'avif' | 'webp'): string | null {
  // Only rewrite local/static raster images where modern variants are expected to exist.
  if (!src || !src.startsWith('/')) return null;
  if (!/\.(png|jpg|jpeg)$/i.test(src)) return null;
  return src.replace(/\.(png|jpg|jpeg)$/i, `.${targetExt}`);
}

export const Image: React.FC<ImageProps> = ({
  src,
  alt,
  width,
  height,
  srcSet,
  sizes,
  loading,
  fetchPriority = 'auto',
  priority = false,
  showSkeleton = false,
  modernFormats = true,
  className,
  onLoad,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const finalLoading = loading ?? (priority ? 'eager' : 'lazy');
  const finalFetchPriority = fetchPriority === 'auto' && priority ? 'high' : fetchPriority;

  const fetchPriorityAttr =
    finalFetchPriority && finalFetchPriority !== 'auto'
      ? ({ fetchPriority: finalFetchPriority } as { fetchPriority: 'high' | 'low' })
      : {};

  const resolvedSrc = typeof src === 'string' ? src : '';
  const avifSrc = modernFormats ? getModernFormatSource(resolvedSrc, 'avif') : null;
  const webpSrc = modernFormats ? getModernFormatSource(resolvedSrc, 'webp') : null;

  React.useEffect(() => {
    setIsLoaded(false);
  }, [resolvedSrc]);

  return (
    <picture className={cn(showSkeleton && "relative block overflow-hidden")}>
      {showSkeleton && !isLoaded && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] skeleton-shimmer"
        />
      )}
        {avifSrc ? <source srcSet={avifSrc} type="image/avif" /> : null}
        {webpSrc ? <source srcSet={webpSrc} type="image/webp" /> : null}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          srcSet={srcSet}
          sizes={sizes}
          loading={finalLoading}
          decoding="async"
          onLoad={(event) => {
            setIsLoaded(true);
            onLoad?.(event);
          }}
          onError={() => {
            setIsLoaded(true);
          }}
          className={className}
          {...fetchPriorityAttr}
          {...props}
        />
    </picture>
  );
};
