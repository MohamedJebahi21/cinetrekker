import { useQuery } from '@tanstack/react-query';
import { useUserLists } from '@/contexts/UserListsContext';
import { UserMediaItem } from '@/types/media';
import { getMovieDetails, getTVDetails } from '@/services/tmdb';
import { SEO } from '@/components/SEO';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import History from 'lucide-react/dist/esm/icons/history';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function WatchHistory() {
  const { watched } = useUserLists();
  const watchedMovies = watched.filter(item => item.mediaType === 'movie');
  const watchedTV = watched.filter(item => item.mediaType === 'tv');
  const [filter, setFilter] = useState<'all' | 'movies' | 'tv'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'alpha'>('recent');

  // Combine and sort watched items
  const allWatched = [
    ...watchedMovies.map(item => ({ ...item, mediaType: 'movie' as const })),
    ...watchedTV.map(item => ({ ...item, mediaType: 'tv' as const }))
  ];

  // Apply filters
  let filtered = allWatched;
  if (filter !== 'all') {
    filtered = filtered.filter(item => item.mediaType === filter.replace('s', ''));
  }

  // Apply sorting
  filtered.sort((a, b) => {
    const aDateStr = a.watchedAt || a.addedAt;
    const bDateStr = b.watchedAt || b.addedAt;
    const aDate = new Date(aDateStr).getTime();
    const bDate = new Date(bDateStr).getTime();
    
    if (sortBy === 'recent') return bDate - aDate;
    if (sortBy === 'oldest') return aDate - bDate;
    return 0;
  });

  // Fetch details for visible items
  const { data: details, isLoading } = useQuery({
    queryKey: ['watch-history', filtered.map(i => i.mediaId).slice(0, 50)],
    queryFn: async () => {
      const promises = filtered.slice(0, 50).map(item => 
        item.mediaType === 'movie' 
          ? getMovieDetails(item.mediaId)
          : getTVDetails(item.mediaId)
      );
      return Promise.all(promises);
    },
    enabled: filtered.length > 0
  });

  // Group by month for timeline view
  const groupByMonth = (items: UserMediaItem[]) => {
    const groups: Record<string, UserMediaItem[]> = {};
    
    items.forEach(item => {
      const watchedDateStr = item.watchedAt || item.addedAt;
      if (!watchedDateStr) {
        if (!groups['Unknown']) groups['Unknown'] = [];
        groups['Unknown'].push(item);
        return;
      }
      
      const date = new Date(watchedDateStr);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(item);
    });
    
    return groups;
  };

  const timelineGroups = groupByMonth(filtered);
  const months = Object.keys(timelineGroups).filter(key => key !== 'Unknown');

  return (
    <>
      <SEO 
        title="Watch History Timeline"
        description="Visual timeline of your watching journey"
      />
      
      <div className="page-container pt-20 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Watch History</h1>
              <p className="text-muted-foreground mt-1">
                {filtered.length} items in your timeline
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'movies' | 'tv')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="movies">Movies</SelectItem>
                <SelectItem value="tv">TV Shows</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'recent' | 'oldest' | 'alpha')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <History className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No watch history yet. Start watching to build your timeline!
            </p>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

            {/* Timeline items */}
            <div className="space-y-8">
              {months.map((month, monthIndex) => (
                <div key={month} className="relative">
                  {/* Month header */}
                  <div className="flex items-center gap-4 mb-4 sticky top-20 z-10 bg-background/95 backdrop-blur-sm py-2">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <span className="text-primary-foreground font-bold">
                        {new Date(month).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold">{month}</h2>
                    <Badge variant="secondary">{timelineGroups[month].length} items</Badge>
                  </div>

                  {/* Items for this month */}
                  <div className="ml-24 space-y-4">
                    {timelineGroups[month].map((item, idx) => {
                      const detail = details?.[filtered.indexOf(item)];
                      const watchedDateStr = item.watchedAt || item.addedAt;
                      const title = (detail?.title || detail?.name) as string | undefined;
                      const vote = detail?.vote_average as number | undefined;
                      
                      return (
                        <Card key={`${item.mediaId}-${idx}`} className="p-4 hover:shadow-lg transition-shadow">
                          <div className="flex gap-4">
                            {detail?.poster_path && (
                              <img
                                src={`https://image.tmdb.org/t/p/w92${detail.poster_path}`}
                                alt=""
                                className="w-16 h-24 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-semibold text-lg">
                                    {title || 'Loading...'}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {item.mediaType === 'movie' ? '🎬 Movie' : '📺 TV Show'}
                                    {detail && ' · '}
                                    {detail && vote && 
                                      `⭐ ${vote.toFixed(1)}`
                                    }
                                  </p>
                                </div>
                                {watchedDate && (
                                  <Badge variant="outline">
                                    {new Date(watchedDate).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </Badge>
                                )}
                              </div>
                              {detail?.overview && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {detail.overview}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Unknown date items */}
              {timelineGroups['Unknown'] && timelineGroups['Unknown'].length > 0 && (
                <div className="relative">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground font-bold">?</span>
                    </div>
                    <h2 className="text-2xl font-bold">Date Unknown</h2>
                    <Badge variant="secondary">{timelineGroups['Unknown'].length} items</Badge>
                  </div>

                  <div className="ml-24 space-y-4">
                    {timelineGroups['Unknown'].map((item, idx) => {
                      const detail = details?.[filtered.indexOf(item)];
                      const title = (detail?.title || detail?.name) as string | undefined;
                      
                      return (
                        <Card key={`${item.mediaId}-${idx}`} className="p-4">
                          <div className="flex gap-4">
                            {detail?.poster_path && (
                              <img
                                src={`https://image.tmdb.org/t/p/w92${detail.poster_path}`}
                                alt=""
                                className="w-16 h-24 object-cover rounded"
                              />
                            )}
                            <div>
                              <h3 className="font-semibold">
                                {title || 'Loading...'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {item.mediaType === 'movie' ? '🎬 Movie' : '📺 TV Show'}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
