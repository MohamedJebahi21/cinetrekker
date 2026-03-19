import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { getRecentlyViewed } from '@/lib/recentlyViewed';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { useTranslation } from 'react-i18next';
import { enrichMediaItems } from '@/lib/mediaEnrichment';

export function RecentlyViewed() {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const recentItems = getRecentlyViewed().slice(0, 8);

  const { data: mediaDetails, isLoading } = useQuery({
    queryKey: ['recently-viewed', recentItems.map((i) => `${i.mediaType}-${i.id}`), language],
    queryFn: () =>
      enrichMediaItems(recentItems, {
        language,
        getReference: (item) => ({
          mediaId: item.id,
          mediaType: item.mediaType,
        }),
        logScope: 'recently-viewed',
      }),
    enabled: recentItems.length > 0,
  });

  if (recentItems.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5" />
        <h2 className="section-title mb-0">Recently Viewed</h2>
      </div>
      {isLoading ? (
        <div className="media-grid">
          {recentItems.map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="media-grid">
          {mediaDetails?.map((media) => (
            <MediaCard key={`${media.id}-${media.media_type}`} media={media} />
          ))}
        </div>
      )}
    </section>
  );
}
