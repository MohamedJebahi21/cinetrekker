import React from 'react';
import { motion, type Variants } from 'framer-motion';
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
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onToggleSelect?: (mediaId: number, mediaType: "movie" | "tv") => void;
}

const gridColsMap = {
  compact: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  normal: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  wide: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

const gapMap = {
  sm: 'gap-2 sm:gap-3',
  md: 'gap-3 lg:gap-4',
  lg: 'gap-4 xl:gap-5',
};

export function MediaGrid({
  items,
  isLoading = false,
  columns = 'normal',
  className = '',
  gap = 'md',
  skeletonCount = 12,
  selectable = false,
  selectedKeys,
  onToggleSelect,
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

  const itemVariants: Variants = {
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
          <MediaCard
            media={media}
            selectable={selectable}
            selected={
              selectedKeys?.has(
                `${(media.media_type ?? "movie") as "movie" | "tv"}-${media.id}`,
              ) ?? false
            }
            onToggleSelect={onToggleSelect}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

interface LoadMoreMediaGridProps extends Omit<MediaGridProps, 'items'> {
  items: (Media & { watchStatus?: string })[];
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function LoadMoreMediaGrid({
  items,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  ...props
}: LoadMoreMediaGridProps) {
  const { t } = useTranslation();

  return (
    <>
      <MediaGrid items={items} {...props} />
      {hasMore && (
        <div className="mt-8 flex justify-center pb-8">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="rounded-xl border border-border/50 bg-secondary/80 px-8 py-3 text-sm font-medium text-foreground backdrop-blur-md transition-all hover:bg-secondary hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            {isLoadingMore ? t('common.loading', 'Loading...') : t('search.loadMore', 'Load More')}
          </button>
        </div>
      )}
    </>
  );
}
