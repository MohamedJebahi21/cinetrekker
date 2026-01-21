import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Film, Tv, Filter, Star } from 'lucide-react';
import { getUpcomingMovies, getOnTheAirTV, getImageUrl } from '@/services/tmdb';
import { useUserLists } from '@/contexts/UserListsContext';
import { useFollowedShows } from '@/hooks/useFollowedShows';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
  voteAverage?: number;
}

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { user } = useAuth();
  const { watchlist } = useUserLists();
  const { followedShows } = useFollowedShows();
  
  const [currentWeek, setCurrentWeek] = useState(new Date());
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
          
          if (showOnlyFollowed && !isInWatchlist) return;
          
          items.push({
            id: movie.id,
            title: movie.title || 'Unknown',
            date: movie.release_date,
            type: 'movie',
            posterPath: movie.poster_path,
            overview: movie.overview,
            isFollowed: isInWatchlist,
            voteAverage: movie.vote_average,
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
          
          if (showOnlyFollowed && !isFollowed) return;
          
          items.push({
            id: show.id,
            title: show.name || 'Unknown',
            date: airDate,
            type: 'tv',
            posterPath: show.poster_path,
            overview: show.overview,
            isFollowed,
            voteAverage: show.vote_average,
          });
        }
      });
    }

    return items;
  }, [upcomingMovies, onAirTV, mediaTypeFilter, showOnlyFollowed, watchlistMovieIds, watchlistTVIds, followedShowIds]);

  // Get days in current week
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start on Monday
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentWeek]);

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

  // Get week range for display
  const weekRange = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }, [currentWeek]);

  const CalendarCard = ({ item }: { item: CalendarItem }) => (
    <Link
      to={`/${item.type}/${item.id}`}
      className="group block"
    >
      <div className={`
        relative overflow-hidden rounded-xl bg-card border border-border
        transition-all duration-300 ease-out
        hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
        hover:-translate-y-1
        ${item.isFollowed ? 'ring-2 ring-primary/40' : ''}
      `}>
        {/* Poster */}
        <div className="relative aspect-[2/3] overflow-hidden">
          {item.posterPath ? (
            <img
              src={getImageUrl(item.posterPath, 'w342')}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              {item.type === 'movie' ? (
                <Film className="w-8 h-8 text-muted-foreground" />
              ) : (
                <Tv className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Type badge */}
          <Badge 
            variant="secondary" 
            className={`absolute top-2 left-2 text-xs font-medium ${
              item.type === 'movie' 
                ? 'bg-blue-500/90 text-white border-0' 
                : 'bg-purple-500/90 text-white border-0'
            }`}
          >
            {item.type === 'movie' ? (
              <><Film className="w-3 h-3 mr-1" />{t('common.movie')}</>
            ) : (
              <><Tv className="w-3 h-3 mr-1" />{t('common.tvShow')}</>
            )}
          </Badge>

          {/* Followed indicator */}
          {item.isFollowed && (
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground border-0">
              <Star className="w-3 h-3 mr-1 fill-current" />
              {t('calendar.followed')}
            </Badge>
          )}

          {/* Rating */}
          {item.voteAverage !== undefined && item.voteAverage > 0 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
              <Star className="w-3 h-3 text-primary fill-primary" />
              <span className="text-xs font-semibold text-white">
                {item.voteAverage.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight mb-1 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          {item.overview && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {item.overview}
            </p>
          )}
        </div>
      </div>
    </Link>
  );

  const DayColumn = ({ day, items }: { day: Date; items: CalendarItem[] }) => {
    const isCurrentDay = isToday(day);
    
    return (
      <div className={`
        flex-1 min-w-[200px] md:min-w-0
        ${isCurrentDay ? 'relative' : ''}
      `}>
        {/* Day Header */}
        <div className={`
          sticky top-0 z-10 p-3 text-center border-b border-border backdrop-blur-sm
          ${isCurrentDay 
            ? 'bg-primary/10' 
            : 'bg-card/95'
          }
        `}>
          <div className={`
            text-xs font-medium uppercase tracking-wider mb-1
            ${isCurrentDay ? 'text-primary' : 'text-muted-foreground'}
          `}>
            {format(day, 'EEE')}
          </div>
          <div className={`
            inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold
            ${isCurrentDay 
              ? 'bg-primary text-primary-foreground' 
              : 'text-foreground'
            }
          `}>
            {format(day, 'd')}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {format(day, 'MMM')}
          </div>
        </div>

        {/* Items */}
        <div className={`
          p-2 space-y-3 min-h-[400px]
          ${isCurrentDay ? 'bg-primary/5' : 'bg-background'}
        `}>
          {items.length > 0 ? (
            items.map((item) => (
              <CalendarCard key={`${item.type}-${item.id}`} item={item} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground/50">
                {t('calendar.noReleases')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <CalendarIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('calendar.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('calendar.subtitle')}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          {/* Week Navigation */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeek(prev => subWeeks(prev, 1))}
              className="h-9 w-9 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[160px] text-center px-2">
              {weekRange}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeek(prev => addWeeks(prev, 1))}
              className="h-9 w-9 rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentWeek(new Date())}
              className="ml-1 rounded-lg"
            >
              {t('calendar.today')}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Media Type Filter */}
            <Select value={mediaTypeFilter} onValueChange={(v) => setMediaTypeFilter(v as 'all' | 'movie' | 'tv')}>
              <SelectTrigger className="w-[130px] rounded-xl">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
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
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
                <Switch
                  id="followed-only"
                  checked={showOnlyFollowed}
                  onCheckedChange={setShowOnlyFollowed}
                />
                <Label htmlFor="followed-only" className="text-sm cursor-pointer whitespace-nowrap">
                  {t('calendar.onlyFollowed')}
                </Label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Calendar Grid */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Desktop View */}
          <div className="hidden md:block border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
            <div className="grid grid-cols-7 divide-x divide-border">
              {weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayItems = itemsByDate.get(dateKey) || [];
                return (
                  <DayColumn key={dateKey} day={day} items={dayItems} />
                );
              })}
            </div>
          </div>

          {/* Mobile View - Horizontal Scroll */}
          <div className="md:hidden">
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-4">
                {weekDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayItems = itemsByDate.get(dateKey) || [];
                  return (
                    <div 
                      key={dateKey} 
                      className="flex-shrink-0 w-[280px] border border-border rounded-2xl overflow-hidden bg-card"
                    >
                      <DayColumn day={day} items={dayItems} />
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="bg-blue-500/90 text-white border-0">
            <Film className="w-3 h-3 mr-1" />
            {t('common.movie')}
          </Badge>
          <span className="text-muted-foreground">{t('common.movies')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="bg-purple-500/90 text-white border-0">
            <Tv className="w-3 h-3 mr-1" />
            {t('common.tvShow')}
          </Badge>
          <span className="text-muted-foreground">{t('common.tvShows')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge className="bg-primary text-primary-foreground border-0">
            <Star className="w-3 h-3 mr-1 fill-current" />
            {t('calendar.followed')}
          </Badge>
          <span className="text-muted-foreground">{t('calendar.inYourList')}</span>
        </div>
      </div>

      {/* Empty State */}
      {!isLoading && showOnlyFollowed && calendarItems.length === 0 && (
        <div className="text-center py-16 mt-8 bg-card border border-border rounded-2xl">
          <div className="p-4 rounded-full bg-muted inline-flex mb-4">
            <CalendarIcon className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">{t('calendar.noFollowedReleases')}</h3>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            {t('calendar.noFollowedReleasesDesc')}
          </p>
        </div>
      )}
    </div>
  );
}
