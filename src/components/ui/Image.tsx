import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  srcSet?: string;
  sizes?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
  priority?: boolean;
  showSkeleton?: boolean;
  modernFormats?: boolean;
  fallback?: React.ReactNode;
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
  fallback,
  className,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
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
    setHasError(false);
  }, [resolvedSrc]);

  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    setIsLoaded(true);
    onError?.(event);
  }, [onError]);

  const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    onLoad?.(event);
  }, [onLoad]);

  if (hasError) {
    return (
      <div className={cn("flex items-center justify-center bg-muted", className)} style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height }}>
        {fallback || (
          <div className="text-center p-2">
            <img
              src="/placeholder.svg"
              alt={alt}
              width={48}
              height={48}
              className="mx-auto h-12 w-12 object-contain opacity-80"
            />
            <p className="mt-2 text-xs text-muted-foreground">{alt || "Image not found"}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <picture
      className={cn(
        "block max-w-full",
        showSkeleton && "relative overflow-hidden",
      )}
    >
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
          onLoad={handleLoad}
          onError={handleError}
          className={cn("block h-auto max-w-full", className)}
          {...fetchPriorityAttr}
          {...props}
        />
    </picture>
  );
};
