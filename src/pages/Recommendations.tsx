import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, EyeOff, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUserLists } from '@/contexts/UserListsContext';
import { getRecommendations, getSimilar } from '@/services/tmdb';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { Media } from '@/types/media';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';

export default function Recommendations() {
  const { t, i18n } = useTranslation();
  const { watched, watchlist, isHiddenFromRecommendations, hideFromRecommendations } = useUserLists();
  const language = i18n.language;
  const resolveMediaType = (media: Media): "movie" | "tv" =>
    media.media_type === "tv" ? "tv" : "movie";

  // Get last 10 watched items
  const recentWatched = watched.slice(-10);

  // Fetch recommendations (collaborative filtering) with fallback to similar
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['recommendations', recentWatched.map(i => `${i.mediaType}-${i.mediaId}`), language],
    queryFn: async () => {
      const allRecommendations: Media[] = [];
      
      await Promise.all(
        recentWatched.map(async (item) => {
          try {
            // First try recommendations endpoint (collaborative filtering)
            const recs = await getRecommendations(item.mediaType, item.mediaId, language);
            const recsResults = recs.results || [];
            
            recsResults.forEach(media => {
              allRecommendations.push({ ...media, media_type: item.mediaType });
            });
            
            // If not enough recommendations, supplement with similar
            if (recsResults.length < 10) {
              const similar = await getSimilar(item.mediaType, item.mediaId, language);
              const existingIds = new Set(recsResults.map(r => r.id));
              (similar.results || []).forEach(media => {
                if (!existingIds.has(media.id)) {
                  allRecommendations.push({ ...media, media_type: item.mediaType });
                }
              });
            }
          } catch {
            // Skip failed requests
          }
        })
      );

      return allRecommendations;
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
             !isHiddenFromRecommendations(media.id, resolveMediaType(media));
    })
    .filter((media, index, self) => 
      index === self.findIndex(m => m.id === media.id && m.media_type === media.media_type)
    )
    .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
    .slice(0, 24) || [];

  return (
    <>
      <SEO 
        title="Recommendations — CineTrekker" 
        description="Personalized movie and TV show recommendations based on what you've watched"
        canonical="https://cinetrekker.vercel.app/recommendations"
      />
    <div className="page-container pt-20 pb-24 md:pb-0">
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
                className="absolute top-2 right-2 opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 focus-visible:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm md:hover:bg-background active:bg-background"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  hideFromRecommendations(media.id, resolveMediaType(media));
                }}
                title={t('recommendations.hideTitle')}
                aria-label={t('recommendations.hideTitle')}
              >
                <EyeOff className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : watched.length === 0 ? (
        <div className="text-center py-16 max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">
            {t('recommendations.empty', "Recommendations aren't ready yet")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t(
              'recommendations.emptyDesc',
              "Watch a few movies and we'll start learning your taste.",
            )}
          </p>
          <Link to="/search">
            <Button className="gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('common.discoverTrending')}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="text-center py-16 max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-3">
            {t('common.noResults', 'No results available')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t(
              'recommendations.watchMore',
              "Watch a few movies and we'll start learning your taste.",
            )}
          </p>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('common.discoverTrending')}
            </Button>
          </Link>
        </div>
      )}
    </div>
    </>
  );
}
