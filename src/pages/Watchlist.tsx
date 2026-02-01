import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bookmark, TrendingUp } from 'lucide-react';
import { useUserLists } from '@/contexts/UserListsContext';
import { getMovieDetails, getTVDetails, getMediaTitle, getMediaType } from '@/services/tmdb';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { Media } from '@/types/media';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';

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
    <>
      <SEO 
        title="My Watchlist — CineTrekker" 
        description="Movies and TV shows you want to watch"
        canonical="https://cinetrekker.lovable.app/watchlist"
      />
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
        <div className="text-center py-16 max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Bookmark className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3 title-display">{t('watchlist.empty')}</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">{t('watchlist.emptyDesc')}</p>
          <Link to="/search">
            <Button className="gap-2">
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
