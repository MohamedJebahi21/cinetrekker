import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Play, Calendar } from 'lucide-react';
import { useUserLists } from '@/contexts/UserListsContext';
import type { MediaDetails } from '@/types/media';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';
import { enrichMediaItems } from '@/lib/mediaEnrichment';

interface TVShowWithProgress extends MediaDetails {
  currentEpisode: number;
  currentSeason: number;
  lastWatched: string;
}

export function ContinueWatching() {
  const { watched } = useUserLists();
  const { i18n } = useTranslation();
  const language = i18n.language;

  // Get TV shows that are marked as "watching"
  const watchingShows = watched.filter(
    (item) => item.mediaType === 'tv' && item.status === 'watching'
  );

  const { data: showsDetails, isLoading } = useQuery({
    queryKey: ['continue-watching', watchingShows.map((s) => s.mediaId), language],
    queryFn: () =>
      enrichMediaItems(watchingShows, {
        language,
        getReference: (item) => item,
        mapExtras: (item) => ({
          currentEpisode: 1,
          currentSeason: 1,
          lastWatched: item.addedAt,
        }),
        logScope: 'continue-watching',
      }) as Promise<TVShowWithProgress[]>,
    enabled: watchingShows.length > 0,
  });

  if (watchingShows.length === 0 || !showsDetails || showsDetails.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Play className="h-5 w-5" />
        <h2 className="section-title mb-0">Continue Watching</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {showsDetails.map((show) => {
          const totalEpisodes =
            show.seasons
              ?.filter((s) => s.season_number > 0)
              .reduce((acc: number, s) => acc + (s.episode_count ?? 0), 0) || 0;
          
          const currentProgress = show.currentSeason * show.currentEpisode;
          const progressPercent = totalEpisodes > 0 ? (currentProgress / totalEpisodes) * 100 : 0;

          return (
            <Link key={show.id} to={`/tv/${show.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg line-clamp-1">{show.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      S{show.currentSeason} E{show.currentEpisode}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>

                  <Badge variant="secondary" className="w-full justify-center">
                    <Play className="h-3 w-3 mr-1" />
                    Continue Watching
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
