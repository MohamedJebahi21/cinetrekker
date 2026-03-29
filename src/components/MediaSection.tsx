import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { Media } from '@/types/media';
import { MediaCard, MediaCardSkeleton } from './MediaCard';
import { MediaCarouselEnhanced } from './MediaCarouselEnhanced';
import { useContentPolicy } from '@/contexts/content-policy-context';
import { applySafetyFilter } from '@/lib/contentFilter';

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
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const memoizedItems = useMemo(
    () => applySafetyFilter(items, strictFiltering, moderateFiltering),
    [items, strictFiltering, moderateFiltering],
  );
  return (
    <MediaCarouselEnhanced
      title={title}
      items={memoizedItems}
      loading={loading}
      showMoreLink={showMoreLink}
      emptyMessage={emptyMessage}
    />
  );
});

