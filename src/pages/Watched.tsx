import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Check, Star, MessageSquare } from 'lucide-react';
import { useUserLists } from '@/contexts/UserListsContext';
import { getMovieDetails, getTVDetails, getImageUrl, getMediaTitle } from '@/services/tmdb';
import { Media } from '@/types/media';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function Watched() {
  const { t, i18n } = useTranslation();
  const { watched } = useUserLists();
  const language = i18n.language;

  // Fetch details for all watched items
  const { data: mediaDetails, isLoading } = useQuery({
    queryKey: ['watched-details', watched.map(i => `${i.mediaType}-${i.mediaId}`), language],
    queryFn: async () => {
      const results = await Promise.all(
        watched.map(async (item) => {
          try {
            const details = item.mediaType === 'movie'
              ? await getMovieDetails(item.mediaId, language)
              : await getTVDetails(item.mediaId, language);
            return { 
              ...details, 
              media_type: item.mediaType,
              userRating: item.rating,
              userNote: item.note,
              userStatus: item.status,
              watchedAt: item.watchedAt,
            } as Media & { userRating?: number; userNote?: string; userStatus?: string; watchedAt?: string };
          } catch {
            return null;
          }
        })
      );
      return results.filter(Boolean);
    },
    enabled: watched.length > 0,
  });

  return (
    <div className="page-container pt-20">
      <h1 className="section-title">{t('watched.title')}</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-24 aspect-[2/3] bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : mediaDetails && mediaDetails.length > 0 ? (
        <div className="space-y-4">
          {mediaDetails.map((media: any) => {
            const title = getMediaTitle(media);
            const posterUrl = getImageUrl(media.poster_path, 'w154');
            const year = (media.release_date || media.first_air_date)?.slice(0, 4);
            const ratingClass = (media.userRating || 0) >= 7 ? 'rating-high' : (media.userRating || 0) >= 5 ? 'rating-medium' : 'rating-low';

            return (
              <Link
                key={`${media.id}-${media.media_type}`}
                to={`/${media.media_type}/${media.id}`}
                className="glass-card-hover p-4 flex gap-4"
              >
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={title}
                    className="w-24 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 aspect-[2/3] bg-muted rounded-lg flex-shrink-0" />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold line-clamp-1">{title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {media.media_type === 'movie' ? t('common.movie') : t('common.tvShow')}
                        </Badge>
                        {year && <span>{year}</span>}
                      </div>
                    </div>
                    
                    {media.userRating && (
                      <div className={cn("rating-badge", ratingClass)}>
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        {media.userRating}/10
                      </div>
                    )}
                  </div>

                  {media.userNote && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="line-clamp-2">{media.userNote}</p>
                    </div>
                  )}

                  {media.userStatus && (
                    <Badge variant="secondary" className="mt-2 capitalize">
                      {t(`status.${media.userStatus}`)}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Check className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('watched.empty')}</h2>
          <p className="text-muted-foreground">{t('watched.emptyDesc')}</p>
        </div>
      )}
    </div>
  );
}
