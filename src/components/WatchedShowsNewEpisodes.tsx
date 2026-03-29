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
import { MediaCarouselEnhanced } from './MediaCarouselEnhanced';
import { Image } from '@/components/ui/Image';
import { getReleaseTimeInfo, hasBeenReleased } from '@/lib/timeUtils';
import { differenceInHours, isSameDay } from 'date-fns';
import { useState } from 'react';
import type { TVEpisodeInfo } from '@/types/media';

interface CachedEpisodeRow extends TVEpisodeInfo {
  show_id: number;
  show_name: string;
  show_poster_path: string | null;
  episode_name?: string;
  episode_id?: number;
}

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

      // Transform snake_case to camelCase for consistency
      const transformedEpisodes = ((data.episodes || []) as unknown as CachedEpisodeRow[]).map((ep) => ({
        ...ep,
        showId: ep.show_id,
        showName: ep.show_name,
        showPosterPath: ep.show_poster_path,
        episodeName: ep.episode_name,
        seasonNumber: ep.season_number,
        episodeNumber: ep.episode_number,
        airDate: ep.air_date,
        episodeId: ep.episode_id,
      }));

      return {
        episodes: transformedEpisodes as NewEpisodeFromWatched[],
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
      <MediaCarouselEnhanced
        title={t('home.didYouWatch')}
        items={[]}
        loading={true}
      />
    );
  }

  // Show empty state if user has watched shows but no new episodes
  if (watchedTVShows.length > 0 && releasedUnwatchedEpisodes.length === 0) {
    return (
      <MediaCarouselEnhanced
        title={t('home.didYouWatch')}
        items={[]}
        loading={false}
        emptyMessage={t('home.didYouWatchEmptyDesc')}
      />
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
    if (!releaseInfo) return null;
    if (releaseInfo.isPast) {
      // Already released
      if (isSameDay(new Date(airDate), now)) {
        return (
          <Badge variant="success" className="text-xs px-2 py-0.5">{t('home.releasedToday', 'Today')}</Badge>
        );
      }
      return (
        <Badge variant="secondary" className="text-xs px-2 py-0.5">{t('home.justReleased', 'Just released')}</Badge>
      );
    } else {
      // Upcoming
      return (
        <Badge variant="outline" className="text-xs px-2 py-0.5">{releaseInfo.relative}</Badge>
      );
    }
  };

  // Render episode cards
  return (
    <section className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {releasedUnwatchedEpisodes.map((episode) => {
          const releaseBadge = getReleaseBadge(episode.air_date);
          return (
            <Card key={episode.episode_id || `${episode.showId}-${episode.season_number}-${episode.episode_number}`}
              className="relative group overflow-hidden p-0">
              {episode.showPosterPath ? (
                <Image
                  src={getImageUrl(episode.showPosterPath, 342)}
                  alt={episode.showName}
                  width={182}
                  height={278}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  loading="lazy"
                  showSkeleton
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
            </Card>
          );
        })}
      </div>
    </section>
  );
}
