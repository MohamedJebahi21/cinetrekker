import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  addWeeks,
  subWeeks,
  isBefore,
  isAfter,
} from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight, Film, Tv, Star, Filter, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLists } from '@/contexts/UserListsContext';
import { useFollowedShows } from '@/hooks/useFollowedShows';
import { getUpcomingMovies, getOnTheAirTV, getImageUrl, getTVDetails } from '@/services/tmdb';
import { Media } from '@/types/media';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import SEO from '@/components/SEO';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getReleaseTimeInfo, formatReleaseDateTime, type ReleaseTimeInfo } from '@/lib/timeUtils';

interface CalendarItem {
  id: number;
  title: string;
  date: string;
  type: 'movie' | 'tv';
  posterPath: string | null;
  overview?: string;
  isFollowed?: boolean;
  voteAverage?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  network?: string;
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

  // Fetch on-the-air TV shows with network info
  const { data: onAirTV, isLoading: loadingTV } = useQuery({
    queryKey: ['on-air-tv-with-networks', language],
    queryFn: async () => {
      const [page1, page2] = await Promise.all([
        getOnTheAirTV(1, language),
        getOnTheAirTV(2, language),
      ]);
      const shows = [...(page1.results || []), ...(page2.results || [])];
      
      // Fetch additional details for network info (limited to first 20 for performance)
      const detailedShows = await Promise.all(
        shows.slice(0, 30).map(async (show) => {
          try {
            const details = await getTVDetails(show.id, language);
            return {
              ...show,
              networks: details.networks || [],
              next_episode_to_air: details.next_episode_to_air,
              last_episode_to_air: details.last_episode_to_air,
            };
          } catch {
            return show;
          }
        })
      );
      
      return detailedShows;
    },
    staleTime: 1000 * 60 * 15,
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
            network: 'Theatrical',
          });
        }
      });
    }

    // Add TV shows with episode info
    if (onAirTV && (mediaTypeFilter === 'all' || mediaTypeFilter === 'tv')) {
      onAirTV.forEach((show: any) => {
        const nextEp = show.next_episode_to_air || show.last_episode_to_air;
        const airDate = nextEp?.air_date || show.first_air_date;
        
        if (airDate) {
          const isFollowed = followedShowIds.has(show.id) || watchlistTVIds.has(show.id);
          
          if (showOnlyFollowed && !isFollowed) return;
          
          // Get network name
          const networkName = show.networks?.[0]?.name || t('calendar.unknownChannel');
          
          items.push({
            id: show.id,
            title: show.name || 'Unknown',
            date: airDate,
            type: 'tv',
            posterPath: show.poster_path,
            overview: show.overview,
            isFollowed,
            voteAverage: show.vote_average,
            seasonNumber: nextEp?.season_number,
            episodeNumber: nextEp?.episode_number,
            network: networkName,
          });
        }
      });
    }

    return items;
  }, [upcomingMovies, onAirTV, mediaTypeFilter, showOnlyFollowed, watchlistMovieIds, watchlistTVIds, followedShowIds, t]);

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
      const dateKey = item.date.split('T')[0]; // Normalize to date only
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

  const CalendarCard = ({ item }: { item: CalendarItem }) => {
    const now = new Date();
    const itemDate = new Date(item.date);
    const isPast = isBefore(itemDate, now);
    const releaseInfo = getReleaseTimeInfo(item.date);
    
    return (
      <Link
        to={`/${item.type}/${item.id}`}
        className="group block"
      >
        <div className={`
          relative overflow-hidden rounded-xl bg-card border border-border
          transition-all duration-300 ease-out
          md:hover:border-primary/30 md:hover:shadow-lg md:hover:shadow-primary/5
          md:hover:-translate-y-1 active:-translate-y-0
          ${item.isFollowed ? 'ring-2 ring-primary/40' : ''}
          ${isPast ? 'opacity-80' : ''}
        `}>
          {/* Poster with aspect ratio */}
          <div className="relative aspect-[2/3] overflow-hidden">
              {item.posterPath ? (
              <img
                src={getImageUrl(item.posterPath, 'w342')}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-300 md:group-hover:scale-105 active:scale-105 focus-visible:scale-105"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            
            {/* Type badge - top left */}
            <Badge 
              variant="secondary" 
              className={`absolute top-2 left-2 text-xs font-medium shadow-md ${
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

            {/* Followed indicator - top right */}
            {item.isFollowed && (
              <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground border-0 shadow-md">
                <Star className="w-3 h-3 mr-1 fill-current" />
                {t('calendar.followed')}
              </Badge>
            )}

            {/* Release time indicator */}
            {releaseInfo && (
              <div className={`absolute bottom-2 left-2 right-2 flex items-center gap-1 text-xs ${
                releaseInfo.isPast ? 'text-green-400' : 'text-yellow-400'
              }`}>
                <Clock className="w-3 h-3" />
                <span className="font-medium truncate">
                  {releaseInfo.relativeTime}
                </span>
              </div>
            )}

            {/* Rating - bottom right */}
            {item.voteAverage !== undefined && item.voteAverage > 0 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md">
                <Star className="w-3 h-3 text-primary fill-primary" />
                <span className="text-xs font-semibold text-white">
                  {item.voteAverage.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-3 space-y-2">
            {/* Title */}
            <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight md:group-hover:text-primary transition-colors active:text-primary focus-visible:text-primary">
              {item.title}
            </h3>
            
            {/* Episode info for TV */}
            {item.type === 'tv' && item.seasonNumber && item.episodeNumber && (
              <p className="text-xs font-medium text-muted-foreground">
                S{item.seasonNumber} E{item.episodeNumber}
              </p>
            )}
            
            {/* Network/Channel */}
            {item.network && (
              <p className="text-xs text-muted-foreground/80 truncate">
                📺 {item.network}
              </p>
            )}
            
            {/* Date & Time */}
            <p className="text-xs text-muted-foreground">
              {formatReleaseDateTime(item.date, language)}
            </p>
          </div>
        </div>
      </Link>
    );
  };

  const DayColumn = ({ day, items }: { day: Date; items: CalendarItem[] }) => {
    const isCurrentDay = isToday(day);
    const isPastDay = isBefore(day, new Date()) && !isCurrentDay;
    
    // Sort items: future first, then past
    const sortedItems = [...items].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const now = new Date();
      const aIsPast = isBefore(dateA, now);
      const bIsPast = isBefore(dateB, now);
      
      if (aIsPast !== bIsPast) return aIsPast ? 1 : -1;
      return dateA.getTime() - dateB.getTime();
    });
    
    return (
      <div className={`
        flex-1 min-w-[220px] md:min-w-0
        ${isCurrentDay ? 'relative' : ''}
      `}>
        {/* Day Header */}
        <div className={`
          sticky top-0 z-10 p-3 text-center border-b border-border backdrop-blur-sm
          ${isCurrentDay 
            ? 'bg-primary/10' 
            : isPastDay 
              ? 'bg-muted/50' 
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
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
              : isPastDay
                ? 'text-muted-foreground'
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
          ${isCurrentDay ? 'bg-primary/5' : isPastDay ? 'bg-muted/20' : 'bg-background'}
        `}>
          {sortedItems.length > 0 ? (
            sortedItems.map((item) => (
              <CalendarCard key={`${item.type}-${item.id}`} item={item} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground/50">
                {t('calendar.noReleasesToday')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <SEO 
        title="Release Calendar — CineTrekker" 
        description="Upcoming movie and TV show releases this week"
        canonical="https://cinetrekker.vercel.app/calendar"
      />
    <div className="page-container pt-20 py-6">
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
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1 shadow-sm">
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
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-sm">
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
                      className="flex-shrink-0 w-[280px] border border-border rounded-2xl overflow-hidden bg-card shadow-sm"
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
        <div className="text-center py-16 mt-8 bg-card border border-border rounded-2xl shadow-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <CalendarIcon className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-foreground title-display">{t('calendar.noFollowedReleases')}</h3>
          <p className="text-muted-foreground max-w-md mx-auto text-sm mb-6 leading-relaxed">
            {t('calendar.noFollowedReleasesDesc')}
          </p>
          <Link to="/search">
            <Button className="gap-2">
              <Film className="w-4 h-4" />
              {t('common.discoverTrending')}
            </Button>
          </Link>
        </div>
      )}
    </div>
    </>
  );
}
