import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { useUserLists } from '@/contexts/UserListsContext';
import { getMovieDetails, getTVDetails, getMediaTitle, getMediaType } from '@/services/tmdb';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { Media } from '@/types/media';

export default function Watchlist() {
  const { t, i18n } = useTranslation();
  const { watchlist } = useUserLists();
  const language = i18n.language;

  // Fetch details for all watchlist items
  const { data: mediaDetails, isLoading } = useQuery({
    queryKey: ['watchlist-details', watchlist.map(i => `${i.mediaType}-${i.mediaId}`), language],
    queryFn: async () => {
      const results = await Promise.all(
        watchlist.map(async (item) => {
          try {
            const details = item.mediaType === 'movie'
              ? await getMovieDetails(item.mediaId, language)
              : await getTVDetails(item.mediaId, language);
            return { ...details, media_type: item.mediaType } as Media;
          } catch {
            return null;
          }
        })
      );
      return results.filter(Boolean) as Media[];
    },
    enabled: watchlist.length > 0,
  });

  return (
    <div className="page-container pt-20">
      <h1 className="section-title">{t('watchlist.title')}</h1>

      {isLoading ? (
        <div className="media-grid">
          {Array.from({ length: watchlist.length || 4 }).map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      ) : mediaDetails && mediaDetails.length > 0 ? (
        <div className="media-grid">
          {mediaDetails.map((media) => (
            <MediaCard key={`${media.id}-${media.media_type}`} media={media} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Bookmark className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('watchlist.empty')}</h2>
          <p className="text-muted-foreground">{t('watchlist.emptyDesc')}</p>
        </div>
      )}
    </div>
  );
}
