import React from 'react';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  srcSet?: string;
  sizes?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
  priority?: boolean;
  showSkeleton?: boolean;
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
  className,
  onLoad,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const finalLoading = loading ?? (priority ? 'eager' : 'lazy');
  const finalFetchPriority = fetchPriority === 'auto' && priority ? 'high' : fetchPriority;

  const fetchPriorityAttr =
    finalFetchPriority && finalFetchPriority !== 'auto'
      ? ({ fetchpriority: finalFetchPriority } as { fetchpriority: 'high' | 'low' })
      : {};

  return (
    <>
      {showSkeleton && !isLoaded && (
        <div aria-hidden="true" className="skeleton-shimmer h-full w-full" />
      )}
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
        className={className}
        {...fetchPriorityAttr}
        {...props}
      />
    </>
  );
};
