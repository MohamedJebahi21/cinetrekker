import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, EyeOff } from 'lucide-react';
import { useUserLists } from '@/contexts/UserListsContext';
import { getSimilar, getMediaType } from '@/services/tmdb';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { Media } from '@/types/media';
import { Button } from '@/components/ui/button';

export default function Recommendations() {
  const { t, i18n } = useTranslation();
  const { watched, watchlist, isHiddenFromRecommendations, hideFromRecommendations } = useUserLists();
  const language = i18n.language;

  // Get last 10 watched items
  const recentWatched = watched.slice(-10);

  // Fetch similar titles for each watched item
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['recommendations', recentWatched.map(i => `${i.mediaType}-${i.mediaId}`), language],
    queryFn: async () => {
      const allSimilar: Media[] = [];
      
      await Promise.all(
        recentWatched.map(async (item) => {
          try {
            const similar = await getSimilar(item.mediaType, item.mediaId, language);
            similar.results.forEach(media => {
              allSimilar.push({ ...media, media_type: item.mediaType });
            });
          } catch {
            // Skip failed requests
          }
        })
      );

      return allSimilar;
    },
    enabled: recentWatched.length > 0,
  });

  // Filter and deduplicate recommendations
  const watchedIds = new Set(watched.map(w => `${w.mediaType}-${w.mediaId}`));
  const watchlistIds = new Set(watchlist.map(w => `${w.mediaType}-${w.mediaId}`));
  
  const filteredRecommendations = recommendations
    ?.filter((media) => {
      const key = `${media.media_type}-${media.id}`;
      return !watchedIds.has(key) && 
             !watchlistIds.has(key) && 
             !isHiddenFromRecommendations(media.id, media.media_type || 'movie');
    })
    .filter((media, index, self) => 
      index === self.findIndex(m => m.id === media.id && m.media_type === media.media_type)
    )
    .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
    .slice(0, 24) || [];

  return (
    <div className="page-container pt-20">
      <div className="mb-8">
        <h1 className="section-title flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          {t('recommendations.title')}
        </h1>
        <p className="text-muted-foreground">{t('recommendations.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="media-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredRecommendations.length > 0 ? (
        <div className="media-grid">
          {filteredRecommendations.map((media) => (
            <div key={`${media.id}-${media.media_type}`} className="relative group">
              <MediaCard media={media} />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  hideFromRecommendations(media.id, media.media_type || 'movie');
                }}
                title={t('recommendations.hideTitle')}
              >
                <EyeOff className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : watched.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('recommendations.empty')}</h2>
          <p className="text-muted-foreground">{t('recommendations.emptyDesc')}</p>
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">{t('common.noResults')}</p>
        </div>
      )}
    </div>
  );
}
