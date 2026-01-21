import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Tv, Check, Eye, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLists } from '@/contexts/UserListsContext';
import { useWatchedEpisodes } from '@/hooks/useFollowedShows';
import { getTVDetails, getImageUrl, getTVSeasonDetails, TVEpisode } from '@/services/tmdb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface NewEpisodeFromWatched extends TVEpisode {
  showId: number;
  showName: string;
  showPosterPath: string | null;
}

export function WatchedShowsNewEpisodes() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { watched, loading: loadingLists } = useUserLists();
  const { isEpisodeWatched, markEpisodeWatched } = useWatchedEpisodes();
  const language = i18n.language;

  // Filter to only TV shows from the watched list
  const watchedTVShows = watched.filter(item => item.mediaType === 'tv');

  const { data: newEpisodes = [], isLoading: loadingEpisodes } = useQuery({
    queryKey: ['watched-shows-new-episodes', watchedTVShows.map(s => s.mediaId), language],
    queryFn: async () => {
      const allNewEpisodes: NewEpisodeFromWatched[] = [];
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const show of watchedTVShows) {
        try {
          const details = await getTVDetails(show.mediaId, language);
          
          // Skip shows that are not in production or have ended
          if (details.status === 'Ended' || details.status === 'Canceled') {
            continue;
          }

          const currentSeason = details.number_of_seasons || 1;
          
          // Check current season for recent episodes
          try {
            const seasonDetails = await getTVSeasonDetails(show.mediaId, currentSeason, language);
            
            for (const episode of seasonDetails.episodes || []) {
              if (episode.air_date) {
                const airDate = new Date(episode.air_date);
                // Include episodes from last 7 days or upcoming in next 7 days
                const sevenDaysFromNow = new Date(today);
                sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                
                if (airDate >= sevenDaysAgo && airDate <= sevenDaysFromNow) {
                  // Get show name from details
                  allNewEpisodes.push({
                    ...episode,
                    showId: show.mediaId,
                    showName: details.name || details.title || 'Unknown Show',
                    showPosterPath: details.poster_path,
                  });
                }
              }
            }
          } catch {
            // Season might not exist yet
          }
        } catch {
          // Show fetch failed
        }
      }

      // Sort by air date, newest first
      return allNewEpisodes.sort((a, b) => {
        const dateA = new Date(a.air_date || 0);
        const dateB = new Date(b.air_date || 0);
        return dateB.getTime() - dateA.getTime();
      });
    },
    enabled: watchedTVShows.length > 0 && !!user,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  // Filter out episodes that have already been marked as watched
  const unwatchedEpisodes = newEpisodes.filter(
    ep => !isEpisodeWatched(ep.showId, ep.season_number, ep.episode_number)
  );

  if (!user) return null;
  if (loadingLists || loadingEpisodes) {
    return (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Tv className="w-5 h-5 text-primary" />
          <h2 className="section-title mb-0">{t('home.didYouWatch')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (watchedTVShows.length === 0 || unwatchedEpisodes.length === 0) {
    return null;
  }

  const today = new Date();

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Tv className="w-5 h-5 text-primary" />
        <h2 className="section-title mb-0">{t('home.didYouWatch')}</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {unwatchedEpisodes.slice(0, 6).map((episode) => {
          const airDate = episode.air_date ? new Date(episode.air_date) : null;
          const isUpcoming = airDate && airDate > today;
          const isNew = airDate && airDate >= new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
          
          return (
            <Card 
              key={`watched-${episode.showId}-${episode.season_number}-${episode.episode_number}`}
              className="glass-card p-4 border-primary/20 bg-primary/5"
            >
              <div className="flex gap-3">
                <Link to={`/tv/${episode.showId}`} className="flex-shrink-0">
                  {episode.showPosterPath ? (
                    <img
                      src={getImageUrl(episode.showPosterPath, 'w185') || ''}
                      alt={episode.showName}
                      className="w-20 h-28 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-20 h-28 bg-muted rounded-md flex items-center justify-center">
                      <Tv className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </Link>
                
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link to={`/tv/${episode.showId}`} className="hover:text-primary transition-colors">
                      <h4 className="font-semibold text-sm line-clamp-1">{episode.showName}</h4>
                    </Link>
                    
                    {isUpcoming ? (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {t('episodes.upcoming')}
                      </Badge>
                    ) : isNew ? (
                      <Badge className="text-xs bg-primary shrink-0">
                        {t('episodes.new')}
                      </Badge>
                    ) : null}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-1">
                    S{episode.season_number}E{episode.episode_number} · {episode.name}
                  </p>
                  
                  <p className="text-xs text-muted-foreground mb-3">
                    {episode.air_date && new Date(episode.air_date).toLocaleDateString(language)}
                  </p>

                  {/* Did you watch it? Prompt */}
                  {!isUpcoming && (
                    <div className="mt-auto space-y-2">
                      <p className="text-xs font-medium text-primary">
                        {t('home.didYouWatchPrompt')}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 text-xs gap-1 flex-1"
                          onClick={(e) => {
                            e.preventDefault();
                            markEpisodeWatched({
                              showId: episode.showId,
                              seasonNumber: episode.season_number,
                              episodeNumber: episode.episode_number,
                              episodeName: episode.name,
                              airDate: episode.air_date || undefined,
                            });
                          }}
                        >
                          <Check className="w-3 h-3" />
                          {t('common.yes')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          asChild
                        >
                          <Link to={`/tv/${episode.showId}`}>
                            <ExternalLink className="w-3 h-3" />
                            {t('common.details')}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}