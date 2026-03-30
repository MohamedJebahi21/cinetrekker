import React, { useState, useMemo, useCallback } from 'react';
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
  parseISO,
} from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight, Film, Tv, Star, Filter, Clock } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useUserLists } from '@/contexts/UserListsContext';
import { useFollowedShows } from '@/hooks/useFollowedShows';
import { getUpcomingMovies, getOnTheAirTV, getImageUrl, getTVDetails } from '@/services/tmdb';
import { Media, TVEpisodeInfo, TVNetwork } from '@/types/media';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import SEO from '@/components/SEO';
import { Image } from '@/components/ui/Image';
import { getReleaseTimeInfo, formatReleaseDateTime } from '@/lib/timeUtils';

interface CalendarItem {
  id: number;
  title: string;
  date: string;
  type: 'movie' | 'tv';
  posterPath: string | null;
  overview?: string;
  isFollowed: boolean;
  voteAverage?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  network?: string;
}

type CalendarTVItem = Media & {
  networks: TVNetwork[];
  next_episode_to_air?: TVEpisodeInfo | null;
  last_episode_to_air?: TVEpisodeInfo | null;
};

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { watchlist } = useUserLists();
  const { followedShows } = useFollowedShows();

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showOnlyFollowed, setShowOnlyFollowed] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');

  // Queries
  const { data: upcomingMovies = [], isLoading: loadingMovies } = useQuery({
    queryKey: ['upcoming-movies', i18n.language],
    queryFn: async () => {
      const [page1, page2] = await Promise.all([
        getUpcomingMovies(1, i18n.language),
        getUpcomingMovies(2, i18n.language),
      ]);
      return [...(page1.results || []), ...(page2.results || [])];
    },
    staleTime: 1000 * 60 * 30,
  });

  const { data: onAirTV = [], isLoading: loadingTV } = useQuery<CalendarTVItem[]>({
    queryKey: ['on-air-tv-with-networks', i18n.language],
    queryFn: async () => {
      const [page1, page2] = await Promise.all([
        getOnTheAirTV(1, i18n.language),
        getOnTheAirTV(2, i18n.language),
      ]);

      const shows = [...(page1.results || []), ...(page2.results || [])];

      const detailedShows = await Promise.all(
        shows.slice(0, 25).map(async (show) => {
          try {
            const details = await getTVDetails(show.id, i18n.language);
            return {
              ...show,
              networks: details.networks || [],
              next_episode_to_air: details.next_episode_to_air,
              last_episode_to_air: details.last_episode_to_air,
            } as CalendarTVItem;
          } catch {
            return {
              ...show,
              networks: [],
              next_episode_to_air: null,
              last_episode_to_air: null,
            } as CalendarTVItem;
          }
        })
      );

      return detailedShows;
    },
    staleTime: 1000 * 60 * 20,
  });

  // Quick lookup sets
  const watchlistMovieIds = useMemo(
    () => new Set(watchlist.filter((w) => w.mediaType === 'movie').map((w) => w.mediaId)),
    [watchlist]
  );

  const watchlistTVIds = useMemo(
    () => new Set(watchlist.filter((w) => w.mediaType === 'tv').map((w) => w.mediaId)),
    [watchlist]
  );

  const followedShowIds = useMemo(
    () => new Set(followedShows.map((s) => s.show_id)),
    [followedShows]
  );

  // Build calendar items
  const calendarItems = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = [];

    // Movies
    if (mediaTypeFilter !== 'tv') {
      upcomingMovies.forEach((movie) => {
        if (!movie.release_date) return;
        const isInWatchlist = watchlistMovieIds.has(movie.id);
        if (showOnlyFollowed && !isInWatchlist) return;

        items.push({
          id: movie.id,
          title: movie.title || 'Unknown Title',
          date: movie.release_date,
          type: 'movie',
          posterPath: movie.poster_path,
          overview: movie.overview,
          isFollowed: isInWatchlist,
          voteAverage: movie.vote_average,
          network: 'Theatrical Release',
        });
      });
    }

    // TV Shows
    if (mediaTypeFilter !== 'movie') {
      onAirTV.forEach((show) => {
        const nextEp = show.next_episode_to_air || show.last_episode_to_air;
        const airDate = nextEp?.air_date || show.first_air_date;
        if (!airDate) return;

        const isFollowed = followedShowIds.has(show.id) || watchlistTVIds.has(show.id);
        if (showOnlyFollowed && !isFollowed) return;

        const networkName = show.networks?.[0]?.name || t('calendar.unknownChannel');

        items.push({
          id: show.id,
          title: show.name || 'Unknown Show',
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
      });
    }

    return items;
  }, [
    upcomingMovies,
    onAirTV,
    mediaTypeFilter,
    showOnlyFollowed,
    watchlistMovieIds,
    watchlistTVIds,
    followedShowIds,
    t,
  ]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentWeek]);

  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarItem[]>();
    calendarItems.forEach((item) => {
      const dateKey = item.date.split('T')[0];
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(item);
    });
    return grouped;
  }, [calendarItems]);

  const isLoading = loadingMovies || loadingTV;

  const weekRange = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return `${format(start, 'MMM d')} — ${format(end, 'MMM d, yyyy')}`;
  }, [currentWeek]);

  const goToPreviousWeek = useCallback(() => setCurrentWeek((prev) => subWeeks(prev, 1)), []);
  const goToNextWeek = useCallback(() => setCurrentWeek((prev) => addWeeks(prev, 1)), []);
  const goToToday = useCallback(() => setCurrentWeek(new Date()), []);

  // Calendar Card
  const CalendarCard = React.memo(({ item }: { item: CalendarItem }) => {
    const itemDate = parseISO(item.date);
    const isPast = isBefore(itemDate, new Date());
    const releaseInfo = getReleaseTimeInfo(item.date);

    return (
      <Link to={`/${item.type}/${item.id}`} className="group block">
        <div
          className={`
            relative overflow-hidden rounded-xl bg-card border border-border 
            transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:-translate-y-0.5
            ${item.isFollowed ? 'ring-2 ring-primary/50' : ''}
            ${isPast ? 'opacity-75' : ''}
          `}
        >
          {/* Poster Section */}
          <div className="relative aspect-[2/3] overflow-hidden">
            {item.posterPath ? (
              <Image
                src={getImageUrl(item.posterPath, 'w342')}
                srcSet={`${getImageUrl(item.posterPath, 'w185')} 185w, ${getImageUrl(item.posterPath, 'w342')} 342w, ${getImageUrl(item.posterPath, 'w500')} 500w`}
                sizes="(max-width: 640px) 280px, 260px"
                alt={item.title}
                width={342}
                height={513}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                showSkeleton
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                {item.type === 'movie' ? <Film className="w-10 h-10 text-muted-foreground" /> : <Tv className="w-10 h-10 text-muted-foreground" />}
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

            {/* Type Badge */}
            <Badge
              className={`absolute top-3 left-3 text-xs font-medium shadow-sm ${
                item.type === 'movie'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-amber-500 text-black'
              } border-0`}
            >
              {item.type === 'movie' ? <Film className="w-3.5 h-3.5 mr-1" /> : <Tv className="w-3.5 h-3.5 mr-1" />}
              {t(item.type === 'movie' ? 'common.movie' : 'common.tvShow')}
            </Badge>

            {/* Followed Badge */}
            {item.isFollowed && (
              <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground border-0 shadow-sm">
                <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                {t('calendar.followed')}
              </Badge>
            )}

            {/* Release Info */}
            {releaseInfo && (
              <div
                className={`absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-xs font-medium ${
                  releaseInfo.isPast ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="truncate">{releaseInfo.relativeTime}</span>
              </div>
            )}

            {/* Rating */}
            {item.voteAverage && item.voteAverage > 0 && (
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur px-2 py-0.5 rounded text-xs font-semibold text-white flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                {item.voteAverage.toFixed(1)}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="p-3.5 space-y-2">
            <h3 className="font-semibold leading-tight line-clamp-2 text-sm group-hover:text-primary transition-colors">
              {item.title}
            </h3>

            {item.type === 'tv' && item.seasonNumber && item.episodeNumber && (
              <p className="text-xs text-muted-foreground font-medium">
                Season {item.seasonNumber} • Episode {item.episodeNumber}
              </p>
            )}

            {item.network && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Tv className="h-3.5 w-3.5" />
                <span className="truncate">{item.network}</span>
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {formatReleaseDateTime(item.date, i18n.language)}
            </p>
          </div>
        </div>
      </Link>
    );
  });

  CalendarCard.displayName = 'CalendarCard';

  const DayColumn = ({ day, items }: { day: Date; items: CalendarItem[] }) => {
    const isCurrentDay = isToday(day);
    const isPastDay = isBefore(day, new Date()) && !isCurrentDay;

    const sortedItems = useMemo(() => {
      return [...items].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    }, [items]);

    return (
      <div className="flex-1 min-w-[260px] md:min-w-0 flex flex-col">
        <div
          className={`sticky top-0 z-20 p-4 border-b border-border backdrop-blur-md transition-colors ${
            isCurrentDay ? 'bg-primary/10' : isPastDay ? 'bg-muted/60' : 'bg-card'
          }`}
        >
          <div className={`text-xs font-medium uppercase tracking-widest mb-1 ${isCurrentDay ? 'text-primary' : 'text-muted-foreground'}`}>
            {format(day, 'EEE')}
          </div>
          <div
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-2xl font-semibold transition-all ${
              isCurrentDay ? 'bg-primary text-primary-foreground shadow-lg' : isPastDay ? 'text-muted-foreground' : 'text-foreground'
            }`}
          >
            {format(day, 'd')}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{format(day, 'MMM')}</div>
        </div>

        <div className={`flex-1 p-3 space-y-3 min-h-[420px] ${isCurrentDay ? 'bg-primary/5' : isPastDay ? 'bg-muted/30' : 'bg-background'}`}>
          {sortedItems.length > 0 ? (
            sortedItems.map((item) => <CalendarCard key={`${item.type}-${item.id}`} item={item} />)
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">{t('calendar.noReleasesToday')}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <SEO
        title={t('calendar.title')}
        description={t('calendar.subtitle')}
        canonical="https://cinetrekker.vercel.app/calendar"
      />

      <div className="ct-page-shell min-h-screen">
        <div className="page-container pt-20 py-8 pb-24 md:pb-8">
        {/* Header & Controls */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="ct-panel flex items-center justify-center rounded-2xl p-3">
              <CalendarIcon className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="ct-kicker mb-2">Release Timeline</p>
              <h1 className="text-3xl font-bold tracking-tight">{t('calendar.title')}</h1>
              <p className="text-muted-foreground mt-1">{t('calendar.subtitle')}</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="ct-toolbar gap-2">
              <Button variant="ghost" size="icon" onClick={goToPreviousWeek} className="h-10 w-10">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-[180px] text-center font-medium text-sm px-4">{weekRange}</div>
              <Button variant="ghost" size="icon" onClick={goToNextWeek} className="h-10 w-10">
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button variant="secondary" size="sm" onClick={goToToday} className="ml-2">
                {t('calendar.today')}
              </Button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Select value={mediaTypeFilter} onValueChange={(v) => setMediaTypeFilter(v as 'all' | 'movie' | 'tv')}>
                <SelectTrigger className="w-40 rounded-2xl">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="movie">{t('common.movies')}</SelectItem>
                  <SelectItem value="tv">{t('common.tvShows')}</SelectItem>
                </SelectContent>
              </Select>

              {user && (
                <div className="ct-toolbar px-4 py-2.5">
                  <Switch id="followed" checked={showOnlyFollowed} onCheckedChange={setShowOnlyFollowed} />
                  <Label htmlFor="followed" className="cursor-pointer text-sm font-medium">
                    {t('calendar.onlyFollowed')}
                  </Label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Calendar */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-80 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="ct-panel hidden overflow-hidden md:block">
              <div className="grid grid-cols-7 divide-x divide-border">
                {weekDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayItems = itemsByDate.get(dateKey) || [];
                  return <DayColumn key={dateKey} day={day} items={dayItems} />;
                })}
              </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-4 pb-6">
                  {weekDays.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayItems = itemsByDate.get(dateKey) || [];
                    return (
                      <div key={dateKey} className="flex-shrink-0 w-[300px]">
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
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 justify-center text-sm">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">Movie</Badge>
            <span className="text-muted-foreground">{t('common.movies')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500 text-black">TV</Badge>
            <span className="text-muted-foreground">{t('common.tvShows')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary">★ Followed</Badge>
            <span className="text-muted-foreground">{t('calendar.inYourList')}</span>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
