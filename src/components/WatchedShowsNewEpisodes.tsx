import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Tv, Check, Clock, CalendarClock, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLists } from '@/contexts/UserListsContext';
import { useWatchedEpisodes } from '@/hooks/useFollowedShows';
import { getTVDetails, getImageUrl, getTVSeasonDetails, TVEpisode } from '@/services/tmdb';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getReleaseTimeInfo, hasBeenReleased } from '@/lib/timeUtils';
import { differenceInHours, isSameDay } from 'date-fns';
import { useState } from 'react';

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
  const [forceRefresh, setForceRefresh] = useState(false);

  // Filter to only TV shows from the watched list
  const watchedTVShows = watched.filter(item => item.mediaType === 'tv');

  // 🚀 Try cache first (instant!)
  const { data: cachedData } = useQuery({
    queryKey: ['new-episodes-cache', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('new_episodes_cache')
        .select('episodes, updated_at')
        .eq('user_id', user.id)
        .single();

      if (error || !data) return null;

      // Check if cache is fresh (< 24 hours old)
      const cacheAge = Date.now() - new Date(data.updated_at).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (cacheAge > maxAge) return null; // Cache is stale

      return {
        episodes: data.episodes as NewEpisodeFromWatched[],
        isCached: true,
        updatedAt: data.updated_at,
      };
    },
    enabled: !!user?.id && !forceRefresh,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Real-time fetch (fallback when cache is empty or force refresh)
  const shouldFetchRealtime = !cachedData || forceRefresh;

  const { data: newEpisodes = [], isLoading: loadingEpisodes } = useQuery({
    queryKey: ['watched-shows-new-episodes', watchedTVShows.map(s => s.mediaId), language],
    queryFn: async () => {
      const allNewEpisodes: NewEpisodeFromWatched[] = [];
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 🚀 OPTIMIZATION: Batch fetch in parallel (chunks of 5) instead of sequential
      const batchSize = 5;
      for (let i = 0; i < watchedTVShows.length; i += batchSize) {
        const batch = watchedTVShows.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (show) => {
          try {
            const details = await getTVDetails(show.mediaId, language);
            
            // Skip shows that are not in production or have ended
            if (details.status === 'Ended' || details.status === 'Canceled') {
              return [];
            }

            const currentSeason = details.number_of_seasons || 1;
            
            // Check current season for recent episodes
            try {
              const seasonDetails = await getTVSeasonDetails(show.mediaId, currentSeason, language);
              
              const recentEpisodes: NewEpisodeFromWatched[] = [];
              for (const episode of seasonDetails.episodes || []) {
                if (episode.air_date) {
                  const airDate = new Date(episode.air_date);
                  // Include episodes from last 7 days or upcoming in next 7 days
                  const sevenDaysFromNow = new Date(today);
                  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                  
                  if (airDate >= sevenDaysAgo && airDate <= sevenDaysFromNow) {
                    recentEpisodes.push({
                      ...episode,
                      showId: show.mediaId,
                      showName: details.name || details.title || 'Unknown Show',
                      showPosterPath: details.poster_path,
                    });
                  }
                }
              }
              return recentEpisodes;
            } catch {
              // Season might not exist yet
              return [];
            }
          } catch {
            // Show fetch failed
            return [];
          }
        });
        
        // Wait for batch to complete before starting next batch
        const batchResults = await Promise.all(batchPromises);
        allNewEpisodes.push(...batchResults.flat());
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
    enabled: shouldFetchRealtime && watchedTVShows.length > 0 && !!user,
    staleTime: 1000 * 60 * 60, // 🚀 OPTIMIZATION 3: Cache for 1 hour (was 30 min)
    gcTime: 1000 * 60 * 120, // Keep in cache for 2 hours
  });

  // Use cached data if available, otherwise use real-time data
  const episodesToShow = cachedData?.episodes || newEpisodes;

  // Filter out episodes that have already been marked as watched
  // AND filter to only show released episodes (time-aware)
  const releasedUnwatchedEpisodes = episodesToShow.filter(ep => {
    const alreadyWatched = isEpisodeWatched(ep.showId, ep.season_number, ep.episode_number);
    const isReleased = hasBeenReleased(ep.air_date);
    return !alreadyWatched && isReleased;
  });

  const isLoadingData = loadingLists || (loadingEpisodes && !cachedData);

  if (!user) return null;
  
  if (loadingLists || loadingEpisodes) {
    return (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Tv className="w-5 h-5 text-primary" />
          <h2 className="section-title mb-0">{t('home.didYouWatch')}</h2>
        </div>
        <div className="media-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
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
        
        {/* 🚀 Cache indicator & manual refresh button */}
        {cachedData && !forceRefresh && (
          <Badge variant="secondary" className="ml-auto text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {t('common.updated')} {new Date(cachedData.updatedAt).toLocaleDateString()}
          </Badge>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={() => setForceRefresh(true)}
          disabled={loadingEpisodes && forceRefresh}
        >
          <RefreshCw className={`w-4 h-4 ${loadingEpisodes && forceRefresh ? 'animate-spin' : ''}`} />
          <span className="text-xs">{t('common.refresh')}</span>
        </Button>
      </div>
      
      <div className="media-grid">
        {releasedUnwatchedEpisodes.map((episode) => {
          const releaseBadge = getReleaseBadge(episode.air_date);
          
          return (
            <Link
              key={`watched-${episode.showId}-${episode.season_number}-${episode.episode_number}`}
              to={`/tv/${episode.showId}`}
              className="group relative block overflow-hidden rounded-lg transition-all duration-300"
            >
              {episode.showPosterPath ? (
                <img
                  src={getImageUrl(episode.showPosterPath, 'w342') || ''}
                  alt={episode.showName}
                  className="w-full h-auto object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full bg-muted aspect-[2/3] flex items-center justify-center">
                  <Tv className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h4 className="font-semibold text-sm line-clamp-2 mb-1">{episode.showName}</h4>
                  <p className="text-xs text-gray-200 mb-2">
                    S{episode.season_number}E{episode.episode_number} • {episode.name}
                  </p>
                  {releaseBadge && <div className="mb-2">{releaseBadge}</div>}
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full h-8 text-xs gap-1"
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
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
