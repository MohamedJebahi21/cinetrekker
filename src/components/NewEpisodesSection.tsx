import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, Play, Check } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useFollowedShows, useWatchedEpisodes } from '@/hooks/useFollowedShows';
import { getTVDetails, getImageUrl, getTVSeasonDetails, TVEpisode } from '@/services/tmdb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface NewEpisode extends TVEpisode {
  showId: number;
  showName: string;
  showPosterPath: string | null;
}

export function NewEpisodesSection() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { followedShows, isLoading: loadingFollowed } = useFollowedShows();
  const { isEpisodeWatched, markEpisodeWatched } = useWatchedEpisodes();
  const language = i18n.language;

  const { data: newEpisodes = [], isLoading: loadingEpisodes } = useQuery({
    queryKey: ['new-episodes', followedShows.map(s => s.show_id), language],
    queryFn: async () => {
      const allNewEpisodes: NewEpisode[] = [];
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const show of followedShows) {
        try {
          const details = await getTVDetails(show.show_id, language);
          const currentSeason = details.number_of_seasons || 1;
          
          // Check current and previous season for recent episodes
          for (let s = Math.max(1, currentSeason - 1); s <= currentSeason; s++) {
            try {
              const seasonDetails = await getTVSeasonDetails(show.show_id, s, language);
              
              for (const episode of seasonDetails.episodes || []) {
                if (episode.air_date) {
                  const airDate = new Date(episode.air_date);
                  // Include episodes from last 7 days or upcoming in next 7 days
                  const sevenDaysFromNow = new Date(today);
                  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                  
                  if (airDate >= sevenDaysAgo && airDate <= sevenDaysFromNow) {
                    allNewEpisodes.push({
                      ...episode,
                      showId: show.show_id,
                      showName: show.show_name,
                      showPosterPath: show.poster_path,
                    });
                  }
                }
              }
            } catch {
              // Season might not exist yet
            }
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
    enabled: followedShows.length > 0,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  if (!user) return null;
  if (loadingFollowed || loadingEpisodes) {
    return (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="section-title mb-0">{t('home.newEpisodes')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (followedShows.length === 0 || newEpisodes.length === 0) {
    return null;
  }

  const today = new Date();

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-primary" />
        <h2 className="section-title mb-0">{t('home.newEpisodes')}</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {newEpisodes.slice(0, 6).map((episode) => {
          const watched = isEpisodeWatched(episode.showId, episode.season_number, episode.episode_number);
          const airDate = episode.air_date ? new Date(episode.air_date) : null;
          const isUpcoming = airDate && airDate > today;
          const isNew = airDate && airDate >= new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
          
          return (
            <Card 
              key={`${episode.showId}-${episode.season_number}-${episode.episode_number}`}
              className={`glass-card p-3 ${watched ? 'opacity-60' : ''}`}
            >
              <div className="flex gap-3">
                <Link to={`/tv/${episode.showId}`} className="flex-shrink-0">
                  {episode.still_path || episode.showPosterPath ? (
                    <img
                      src={getImageUrl(episode.still_path || episode.showPosterPath, 'w185') || ''}
                      alt={episode.name}
                      className="w-24 h-16 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-24 h-16 bg-muted rounded-md" />
                  )}
                </Link>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/tv/${episode.showId}`} className="hover:text-primary transition-colors">
                        <h4 className="font-medium text-sm line-clamp-1">{episode.showName}</h4>
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        S{episode.season_number}E{episode.episode_number}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {isUpcoming && (
                        <Badge variant="outline" className="text-xs">
                          {t('episodes.upcoming')}
                        </Badge>
                      )}
                      {isNew && !isUpcoming && (
                        <Badge className="text-xs bg-primary">
                          {t('episodes.new')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {episode.name}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {episode.air_date}
                    </span>
                    
                    {!isUpcoming && (
                      <Button
                        variant={watched ? "secondary" : "default"}
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={(e) => {
                          e.preventDefault();
                          if (!watched) {
                            markEpisodeWatched({
                              showId: episode.showId,
                              seasonNumber: episode.season_number,
                              episodeNumber: episode.episode_number,
                              episodeName: episode.name,
                              airDate: episode.air_date || undefined,
                            });
                          }
                        }}
                        disabled={watched}
                      >
                        {watched ? (
                          <>
                            <Check className="w-3 h-3" />
                            {t('episodes.watched')}
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            {t('episodes.markWatched')}
                          </>
                        )}
                      </Button>
                    )}
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
