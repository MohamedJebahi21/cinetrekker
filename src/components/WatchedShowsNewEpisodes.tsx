import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Tv, Check, ExternalLink, Clock, CalendarClock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLists } from '@/contexts/UserListsContext';
import { useWatchedEpisodes } from '@/hooks/useFollowedShows';
import { getTVDetails, getImageUrl, getTVSeasonDetails, TVEpisode } from '@/services/tmdb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getReleaseTimeInfo, hasBeenReleased } from '@/lib/timeUtils';
import { differenceInHours, isSameDay } from 'date-fns';

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

      // Sort by air date, newest first (released episodes first, then upcoming)
      return allNewEpisodes.sort((a, b) => {
        const dateA = new Date(a.air_date || 0);
        const dateB = new Date(b.air_date || 0);
        const now = new Date();
        
        // Released episodes come first
        const aReleased = dateA <= now;
        const bReleased = dateB <= now;
        
        if (aReleased && !bReleased) return -1;
        if (!aReleased && bReleased) return 1;
        
        // For released episodes, most recent first
        if (aReleased && bReleased) {
          return dateB.getTime() - dateA.getTime();
        }
        
        // For upcoming, soonest first
        return dateA.getTime() - dateB.getTime();
      });
    },
    enabled: watchedTVShows.length > 0 && !!user,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  // Filter out episodes that have already been marked as watched
  // AND filter to only show released episodes (time-aware)
  const releasedUnwatchedEpisodes = newEpisodes.filter(ep => {
    const alreadyWatched = isEpisodeWatched(ep.showId, ep.season_number, ep.episode_number);
    const isReleased = hasBeenReleased(ep.air_date);
    return !alreadyWatched && isReleased;
  });

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
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  // Show empty state if user has watched shows but no new episodes
  if (watchedTVShows.length > 0 && releasedUnwatchedEpisodes.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Tv className="w-5 h-5 text-primary" />
          <h2 className="section-title mb-0">{t('home.didYouWatch')}</h2>
        </div>
        <Card className="glass-card p-6 border-border/50 text-center">
          <CalendarClock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {t('home.didYouWatchEmpty')}
          </p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            {t('home.didYouWatchEmptyDesc')}
          </p>
        </Card>
      </section>
    );
  }

  if (watchedTVShows.length === 0) {
    return null;
  }

  const now = new Date();

  // Get release label for an episode
  const getReleaseBadge = (airDate: string | null) => {
    if (!airDate) return null;
    
    const releaseInfo = getReleaseTimeInfo(airDate);
    if (!releaseInfo || !releaseInfo.isPast) return null;
    
    const date = new Date(airDate);
    const hoursAgo = differenceInHours(now, date);
    
    if (hoursAgo <= 2) {
      return (
        <Badge className="text-xs bg-green-500 text-white border-0 shadow-sm">
          <Clock className="w-3 h-3 mr-1" />
          {t('home.justReleased')}
        </Badge>
      );
    }
    
    if (isSameDay(date, now)) {
      if (hoursAgo <= 12) {
        return (
          <Badge className="text-xs bg-primary border-0 shadow-sm">
            {t('home.releasedHoursAgo', { hours: hoursAgo })}
          </Badge>
        );
      }
      return (
        <Badge className="text-xs bg-primary border-0 shadow-sm">
          {t('home.releasedToday')}
        </Badge>
      );
    }
    
    // Released in last 7 days
    if (hoursAgo < 168) {
      const daysAgo = Math.floor(hoursAgo / 24);
      return (
        <Badge variant="secondary" className="text-xs">
          {daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Tv className="w-5 h-5 text-primary" />
        <h2 className="section-title mb-0">{t('home.didYouWatch')}</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {releasedUnwatchedEpisodes.slice(0, 6).map((episode) => {
          const releaseBadge = getReleaseBadge(episode.air_date);
          
          return (
            <Card 
              key={`watched-${episode.showId}-${episode.season_number}-${episode.episode_number}`}
              className="glass-card p-4 border-primary/20 bg-primary/5 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex gap-3">
                <Link to={`/tv/${episode.showId}`} className="flex-shrink-0">
                  {episode.showPosterPath ? (
                    <img
                      src={getImageUrl(episode.showPosterPath, 'w185') || ''}
                      alt={episode.showName}
                      className="w-20 h-28 object-cover rounded-lg shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-28 bg-muted rounded-lg flex items-center justify-center">
                      <Tv className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </Link>
                
                <div className="flex-1 min-w-0 flex flex-col">
                  {/* Title row with badge */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link to={`/tv/${episode.showId}`} className="hover:text-primary transition-colors">
                      <h4 className="font-semibold text-sm line-clamp-1">{episode.showName}</h4>
                    </Link>
                    {releaseBadge}
                  </div>
                  
                  {/* Episode info */}
                  <p className="text-xs font-medium text-foreground/80 mb-1">
                    S{episode.season_number}E{episode.episode_number}
                  </p>
                  
                  {/* Episode name */}
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                    {episode.name}
                  </p>
                  
                  {/* Release date */}
                  <p className="text-xs text-muted-foreground/70 mb-3">
                    {episode.air_date && new Date(episode.air_date).toLocaleDateString(language, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>

                  {/* Did you watch it? Prompt */}
                  <div className="mt-auto space-y-2">
                    <p className="text-xs font-medium text-primary">
                      {t('home.didYouWatchPrompt')}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs gap-1 flex-1 shadow-sm"
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
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
