import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Film, Tv, Filter } from 'lucide-react';
import { getUpcomingMovies, getOnTheAirTV, getImageUrl, getTVDetails, getMovieDetails } from '@/services/tmdb';
import { useUserLists } from '@/contexts/UserListsContext';
import { useFollowedShows } from '@/hooks/useFollowedShows';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Media } from '@/types/media';

interface CalendarItem {
  id: number;
  title: string;
  date: string;
  type: 'movie' | 'tv';
  posterPath: string | null;
  overview?: string;
  isFollowed?: boolean;
}

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { user } = useAuth();
  const { watchlist } = useUserLists();
  const { followedShows } = useFollowedShows();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showOnlyFollowed, setShowOnlyFollowed] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');

  // Fetch upcoming movies (multiple pages for better coverage)
  const { data: upcomingMovies, isLoading: loadingMovies } = useQuery({
    queryKey: ['upcoming-movies', language],
    queryFn: async () => {
      const [page1, page2] = await Promise.all([
        getUpcomingMovies(1, language),
        getUpcomingMovies(2, language),
      ]);
      return [...(page1.results || []), ...(page2.results || [])];
    },
  });

  // Fetch on-the-air TV shows
  const { data: onAirTV, isLoading: loadingTV } = useQuery({
    queryKey: ['on-air-tv', language],
    queryFn: async () => {
      const [page1, page2] = await Promise.all([
        getOnTheAirTV(1, language),
        getOnTheAirTV(2, language),
      ]);
      return [...(page1.results || []), ...(page2.results || [])];
    },
  });

  // Create sets for quick lookup
  const watchlistMovieIds = useMemo(() => 
    new Set(watchlist.filter(w => w.mediaType === 'movie').map(w => w.mediaId)),
    [watchlist]
  );
  
  const watchlistTVIds = useMemo(() => 
    new Set(watchlist.filter(w => w.mediaType === 'tv').map(w => w.mediaId)),
    [watchlist]
  );
  
  const followedShowIds = useMemo(() => 
    new Set(followedShows.map(s => s.show_id)),
    [followedShows]
  );

  // Transform data into calendar items
  const calendarItems = useMemo(() => {
    const items: CalendarItem[] = [];

    // Add movies
    if (upcomingMovies && (mediaTypeFilter === 'all' || mediaTypeFilter === 'movie')) {
      upcomingMovies.forEach((movie: Media) => {
        if (movie.release_date) {
          const isInWatchlist = watchlistMovieIds.has(movie.id);
          
          // Skip if filtering for followed only and not in watchlist
          if (showOnlyFollowed && !isInWatchlist) return;
          
          items.push({
            id: movie.id,
            title: movie.title || 'Unknown',
            date: movie.release_date,
            type: 'movie',
            posterPath: movie.poster_path,
            overview: movie.overview,
            isFollowed: isInWatchlist,
          });
        }
      });
    }

    // Add TV shows
    if (onAirTV && (mediaTypeFilter === 'all' || mediaTypeFilter === 'tv')) {
      onAirTV.forEach((show: Media) => {
        const airDate = show.first_air_date;
        if (airDate) {
          const isFollowed = followedShowIds.has(show.id) || watchlistTVIds.has(show.id);
          
          // Skip if filtering for followed only and not followed
          if (showOnlyFollowed && !isFollowed) return;
          
          items.push({
            id: show.id,
            title: show.name || 'Unknown',
            date: airDate,
            type: 'tv',
            posterPath: show.poster_path,
            overview: show.overview,
            isFollowed,
          });
        }
      });
    }

    return items;
  }, [upcomingMovies, onAirTV, mediaTypeFilter, showOnlyFollowed, watchlistMovieIds, watchlistTVIds, followedShowIds]);

  // Get days in current month view
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Group items by date
  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarItem[]>();
    calendarItems.forEach(item => {
      const dateKey = item.date;
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(item);
    });
    return grouped;
  }, [calendarItems]);

  const isLoading = loadingMovies || loadingTV;

  // Get first day of week offset (0 = Sunday)
  const firstDayOffset = startOfMonth(currentMonth).getDay();

  return (
    <div className="page-container py-8">
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">{t('calendar.title')}</h1>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold min-w-[180px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
              className="ml-2"
            >
              {t('calendar.today')}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Media Type Filter */}
            <Select value={mediaTypeFilter} onValueChange={(v) => setMediaTypeFilter(v as 'all' | 'movie' | 'tv')}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="movie">{t('common.movies')}</SelectItem>
                <SelectItem value="tv">{t('common.tvShows')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Show Only Followed Toggle */}
            {user && (
              <div className="flex items-center gap-2">
                <Switch
                  id="followed-only"
                  checked={showOnlyFollowed}
                  onCheckedChange={setShowOnlyFollowed}
                />
                <Label htmlFor="followed-only" className="text-sm cursor-pointer">
                  {t('calendar.onlyFollowed')}
                </Label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-muted/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-muted-foreground border-b border-border"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[120px] p-2 border-b border-r border-border bg-muted/20" />
            ))}

            {/* Actual days */}
            {monthDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayItems = itemsByDate.get(dateKey) || [];
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={dateKey}
                  className={`min-h-[120px] p-2 border-b border-r border-border transition-colors ${
                    isCurrentDay ? 'bg-primary/5' : 'hover:bg-muted/30'
                  }`}
                >
                  {/* Day Number */}
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentDay 
                      ? 'w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center' 
                      : 'text-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  {/* Items for this day */}
                  <div className="space-y-1 overflow-y-auto max-h-[80px]">
                    {dayItems.slice(0, 3).map((item) => (
                      <Link
                        key={`${item.type}-${item.id}`}
                        to={`/${item.type}/${item.id}`}
                        className={`block text-xs p-1 rounded truncate transition-colors ${
                          item.type === 'movie'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20'
                        } ${item.isFollowed ? 'ring-1 ring-primary/50' : ''}`}
                        title={item.title}
                      >
                        <span className="flex items-center gap-1">
                          {item.type === 'movie' ? (
                            <Film className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <Tv className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span className="truncate">{item.title}</span>
                        </span>
                      </Link>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayItems.length - 3} {t('calendar.more')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center">
            <Film className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-muted-foreground">{t('common.movies')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-500/20 flex items-center justify-center">
            <Tv className="h-3 w-3 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-muted-foreground">{t('common.tvShows')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-primary/50" />
          <span className="text-muted-foreground">{t('calendar.followed')}</span>
        </div>
      </div>

      {/* Empty State */}
      {!isLoading && showOnlyFollowed && calendarItems.length === 0 && (
        <div className="text-center py-12">
          <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('calendar.noFollowedReleases')}</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t('calendar.noFollowedReleasesDesc')}
          </p>
        </div>
      )}
    </div>
  );
}
