import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Media } from '@/types/media';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import MovieSkeleton from '@/components/ui/MovieSkeleton';

interface MediaGridProps {
  items: (Media & { watchStatus?: string })[];
  isLoading?: boolean;
  columns?: 'compact' | 'normal' | 'wide';
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
  /** Number of skeleton items to show while loading */
  skeletonCount?: number;
}

const gridColsMap = {
  compact: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  normal: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  wide: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
};

const gapMap = {
  sm: 'gap-3 lg:gap-4',
  md: 'gap-3 lg:gap-4',
  lg: 'gap-3 lg:gap-4',
};

export function MediaGrid({
  items,
  isLoading = false,
  columns = 'normal',
  className = '',
  gap = 'md',
  skeletonCount = 12,
}: MediaGridProps) {
  const { t } = useTranslation();

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

  // Loading state with staggered skeletons
  if (isLoading) {
    return (
      <div className={`grid ${gridColsMap[columns]} ${gapMap[gap]} ${className}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <MovieSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-lg">{t('common.noResults', 'No results available')}</p>
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
  const { t } = useTranslation();
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
          <div className="animate-pulse text-muted-foreground">{t('common.loading', 'Loading...')}</div>
        </div>
      )}
    </>
  );
}
