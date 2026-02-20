import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MediaPosterProps {
  src: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
}

export function MediaPoster({ src, alt, className, imageClassName }: MediaPosterProps) {
  const [loaded, setLoaded] = useState(false);

  if (!src) {
    return (
      <div className={cn('relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-muted', className)}>
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">No image</div>
      </div>
    );
  }

  return (
    <div className={cn('relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-muted', className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          'h-full w-full object-cover transition-all duration-500',
          loaded ? 'opacity-100 blur-0' : 'opacity-60 blur-sm',
          imageClassName,
        )}
      />
    </div>
  );
}
