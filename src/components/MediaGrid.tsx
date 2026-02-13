import React from 'react';
import { motion } from 'framer-motion';
import { Media } from '@/types/media';
import { MediaCard } from '@/components/MediaCard';
import { MediaGridSkeleton } from '@/components/ui/SkeletonLoader';

interface MediaGridProps {
  items: (Media & { watchStatus?: string })[];
  isLoading?: boolean;
  columns?: 'compact' | 'normal' | 'wide';
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}

const gridColsMap = {
  compact: 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7',
  normal: 'grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6',
  wide: 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
};

const gapMap = {
  sm: 'gap-2 xs:gap-2.5 sm:gap-3 md:gap-3.5',
  md: 'gap-3 xs:gap-3.5 sm:gap-4 md:gap-5 lg:gap-6',
  lg: 'gap-4 xs:gap-4.5 sm:gap-5 md:gap-6 lg:gap-7',
};

export function MediaGrid({
  items,
  isLoading = false,
  columns = 'normal',
  className = '',
  gap = 'md',
}: MediaGridProps) {
  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  if (isLoading) {
    const skeletonColumns = columns === 'compact' ? 6 : columns === 'normal' ? 5 : 4 as const;
    return <MediaGridSkeleton count={12} columns={skeletonColumns} />;
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-lg">No items found</p>
      </div>
    );
  }

  return (
    <motion.div
      className={`grid ${gridColsMap[columns]} ${gapMap[gap]} ${className}`}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {items.map((media) => (
        <motion.div
          key={`${media.media_type}-${media.id}`}
          variants={itemVariants}
          className="h-full"
        >
          <MediaCard media={media} />
        </motion.div>
      ))}
    </motion.div>
  );
}

interface InfiniteMediaGridProps extends Omit<MediaGridProps, 'items'> {
  items: (Media & { watchStatus?: string })[];
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function InfiniteMediaGrid({
  items,
  hasMore = false,
  onLoadMore,
  ...props
}: InfiniteMediaGridProps) {
  const observerTarget = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!hasMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <>
      <MediaGrid items={items} {...props} />
      {hasMore && (
        <div ref={observerTarget} className="h-20 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading more...</div>
        </div>
      )}
    </>
  );
}
