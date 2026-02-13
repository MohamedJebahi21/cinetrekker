import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { Media } from '@/types/media';
import { MediaCard, MediaCardSkeleton } from './MediaCard';

interface MediaSectionProps {
  title: string;
  items: Media[];
  loading?: boolean;
  showMoreLink?: string;
  emptyMessage?: string;
  children?: ReactNode;
}

import React, { useMemo } from 'react';
export const MediaSection = React.memo(function MediaSection({ 
  title, 
  items, 
  loading = false, 
  showMoreLink,
  emptyMessage,
}: MediaSectionProps) {
  const { t } = useTranslation();
  const memoizedItems = useMemo(() => items, [items]);
  return (
    <section className="animate-fade-in section-after-hero">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title-responsive font-bold text-2xl md:text-3xl heading-cinematic">{title}</h2>
        {showMoreLink && (
          <Link 
            to={showMoreLink}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {t('common.seeAll')}
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {loading ? (
        <div className="media-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      ) : memoizedItems.length > 0 ? (
        <div className="media-grid">
          {memoizedItems.map((item) => (
            <MediaCard key={`${item.id}-${item.media_type || 'unknown'}`} media={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {emptyMessage || t('common.noResults')}
        </div>
      )}
    </section>
  );
});
