import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfDay,
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
import { getUpcomingMovies, getOnTheAirTV, getImageUrl, getTVDetails, getMediaTitle } from '@/services/tmdb';
import { Media, TVEpisodeInfo, TVNetwork } from '@/types/media';

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

import SEO from '@/components/SEO';
import { Image } from '@/components/ui/Image';
import { getReleaseTimeInfo, formatReleaseDateTime } from '@/lib/timeUtils';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';

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
  const todayStart = startOfDay(new Date());

  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showOnlyFollowed, setShowOnlyFollowed] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');

  // Queries
  const { data: upcomingMovies = [], isLoading: loadingMovies, isError: moviesError, error: moviesErrorValue, refetch: refetchMovies } = useQuery({
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

  const { data: onAirTV = [], isLoading: loadingTV, isError: tvError, error: tvErrorValue, refetch: refetchTV } = useQuery<CalendarTVItem[]>({
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
          title: getMediaTitle(movie),
          date: movie.release_date,
          type: 'movie',
          posterPath: movie.poster_path,
          overview: movie.overview,
          isFollowed: isInWatchlist,
          voteAverage: movie.vote_average,
          network: t('calendar.theatricalRelease', 'Theatrical Release'),
        });
      });
    }

    // TV Shows
    if (mediaTypeFilter !== 'movie') {
      onAirTV.forEach((show) => {
        const nextEp = show.next_episode_to_air;
        const firstAirDate =
          show.first_air_date && !isBefore(parseISO(show.first_air_date), todayStart)
            ? show.first_air_date
            : null;
        const airDate = nextEp?.air_date || firstAirDate;
        if (!airDate) return;

        const isFollowed = followedShowIds.has(show.id) || watchlistTVIds.has(show.id);
        if (showOnlyFollowed && !isFollowed) return;

        const networkName = show.networks?.[0]?.name || t('calendar.unknownChannel');

        items.push({
          id: show.id,
          title: getMediaTitle(show),
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
    todayStart,
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
  const calendarLoadingTimedOut = useLoadingTimeout(isLoading, 14000);
  const hasCalendarError = moviesError || tvError;

  const weekRange = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return `${format(start, 'MMM d')} — ${format(end, 'MMM d, yyyy')}`;
  }, [currentWeek]);

  const goToPreviousWeek = useCallback(() => setCurrentWeek((prev) => subWeeks(prev, 1)), []);
  const goToNextWeek = useCallback(() => setCurrentWeek((prev) => addWeeks(prev, 1)), []);
  const goToToday = useCallback(() => setCurrentWeek(new Date()), []);

  const weekItemsCount = useMemo(() => {
    return weekDays.reduce((total, day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return total + (itemsByDate.get(dateKey)?.length || 0);
    }, 0);
  }, [itemsByDate, weekDays]);

  const upcomingPreview = useMemo(() => {
    return [...calendarItems]
      .filter((item) => !isBefore(parseISO(item.date), todayStart))
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .slice(0, 6);
  }, [calendarItems, todayStart]);

  // Calendar Card
  const CalendarCard = React.memo(({ item }: { item: CalendarItem }) => {
    const itemDate = parseISO(item.date);
    const isPast = isBefore(itemDate, todayStart);
    const releaseInfo = getReleaseTimeInfo(item.date);

    return (
      <Link to={`/${item.type}/${item.id}`} className="group block">
        <div
          className={`
            relative overflow-hidden rounded-xl bg-card border border-border 
            transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:-translate-y-0.5 motion-reduce:transition-none
            ${item.isFollowed ? 'ring-2 ring-primary/50' : ''}
            ${isPast ? 'opacity-75' : ''}
          `}
        >
          <div className="flex min-w-0 sm:block">
            {/* Poster Section */}
            <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden sm:w-full">
              {item.posterPath ? (
                <Image
                  src={getImageUrl(item.posterPath, 'w342')}
                  srcSet={`${getImageUrl(item.posterPath, 'w185')} 185w, ${getImageUrl(item.posterPath, 'w342')} 342w, ${getImageUrl(item.posterPath, 'w500')} 500w`}
                  sizes="(max-width: 640px) 112px, 260px"
                  alt={t('calendar.posterAlt', 'Poster of {{title}}', { title: item.title })}
                  width={342}
                  height={513}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  showSkeleton
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  {item.type === 'movie' ? <Film className="w-10 h-10 text-muted-foreground" /> : <Tv className="w-10 h-10 text-muted-foreground" />}
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

              <Badge
                className={`absolute left-2 top-2 border-0 text-[10px] font-medium shadow-sm sm:left-3 sm:top-3 sm:text-xs ${
                  item.type === 'movie'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-amber-500 text-black'
                }`}
              >
                {item.type === 'movie' ? <Film className="mr-1 w-3 h-3 sm:h-3.5 sm:w-3.5" /> : <Tv className="mr-1 w-3 h-3 sm:h-3.5 sm:w-3.5" />}
                {t(item.type === 'movie' ? 'common.movie' : 'common.tvShow')}
              </Badge>

              {item.isFollowed && (
                <Badge className="absolute right-2 top-2 border-0 bg-primary px-2 text-[10px] text-primary-foreground shadow-sm sm:right-3 sm:top-3 sm:text-xs">
                  <Star className="mr-1 h-3 w-3 fill-current sm:h-3.5 sm:w-3.5" />
                  {t('calendar.followed')}
                </Badge>
              )}

              {item.voteAverage && item.voteAverage > 0 && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur sm:bottom-3 sm:right-3">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {item.voteAverage.toFixed(1)}
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:p-3.5">
              <div className="space-y-2">
                <h3 className="line-clamp-2 text-sm font-semibold leading-tight transition-colors group-hover:text-primary">
                  {item.title}
                </h3>

                {item.type === 'tv' && item.seasonNumber && item.episodeNumber && (
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('calendar.seasonEpisode', 'Season {{season}} • Episode {{episode}}', {
                      season: item.seasonNumber,
                      episode: item.episodeNumber,
                    })}
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

              {releaseInfo && (
                <div
                  className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${
                    releaseInfo.isPast ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span className="truncate">{releaseInfo.relativeTime}</span>
                </div>
              )}
            </div>
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
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={`z-20 border-b border-border p-4 backdrop-blur-md transition-colors md:sticky md:top-0 ${
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

        <div className={`flex-1 space-y-3 p-2.5 sm:p-3 min-h-[220px] md:min-h-[420px] ${isCurrentDay ? 'bg-primary/5' : isPastDay ? 'bg-muted/30' : 'bg-background'}`}>
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
        <div className="page-container pt-20 py-6 pb-24 md:py-8 md:pb-8">
        {/* Header & Controls */}
        <div className="mb-8">
          <div className="mb-6 flex items-start gap-3 sm:items-center sm:gap-4">
            <div className="ct-panel flex shrink-0 items-center justify-center rounded-2xl p-3">
              <CalendarIcon className="w-7 h-7 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="ct-kicker mb-2">{t('calendar.releaseTimeline', 'Release Timeline')}</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('calendar.title')}</h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">{t('calendar.subtitle')}</p>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="ct-toolbar w-full justify-between gap-2 sm:w-auto sm:justify-start">
              <Button variant="ghost" size="icon" onClick={goToPreviousWeek} aria-label={t('calendar.previousWeek', 'Previous week')} className="h-11 w-11 sm:h-10 sm:w-10">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1 px-2 text-center text-sm font-medium sm:min-w-[180px] sm:px-4">{weekRange}</div>
              <Button variant="ghost" size="icon" onClick={goToNextWeek} aria-label={t('calendar.nextWeek', 'Next week')} className="h-11 w-11 sm:h-10 sm:w-10">
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button variant="secondary" size="sm" onClick={goToToday} className="w-full sm:ml-2 sm:w-auto">
                {t('calendar.today')}
              </Button>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
              <Select value={mediaTypeFilter} onValueChange={(v) => setMediaTypeFilter(v as 'all' | 'movie' | 'tv')}>
                <SelectTrigger className="w-full rounded-2xl sm:w-40">
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
                <div className="ct-toolbar w-full px-4 py-2.5 sm:w-auto">
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
        {isLoading && !calendarLoadingTimedOut ? (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-80 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : hasCalendarError || calendarLoadingTimedOut ? (
          <div className="ct-panel mx-auto max-w-2xl p-8 text-center">
            <h2 className="text-xl font-semibold text-foreground">{t('calendar.unableToLoad', 'Unable to load calendar')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {calendarLoadingTimedOut
                ? t('calendar.loadingTooLong', 'Loading took too long. Please try again.')
                : (moviesErrorValue as Error | undefined)?.message ||
                  (tvErrorValue as Error | undefined)?.message ||
                  t('calendar.fetchError', 'Something went wrong while fetching releases.')}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => { void refetchMovies(); void refetchTV(); }}>
                {t('common.retry')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {weekItemsCount === 0 && (
              <div className="ct-panel mb-6 p-5 text-center">
                <h2 className="text-lg font-semibold text-foreground">{t('calendar.noReleasesWeek', 'No releases this week')}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('calendar.noReleasesWeekDesc', 'Check upcoming weeks for new premieres and episodes.')}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Button variant="secondary" onClick={goToNextWeek}>{t('calendar.viewNextWeek', 'View next week')}</Button>
                  <Button variant="outline" onClick={goToToday}>{t('calendar.backToCurrentWeek', 'Back to current week')}</Button>
                </div>
                {upcomingPreview.length > 0 && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    {t('calendar.nextUp', 'Next up')}: {upcomingPreview.map((item) => item.title).join(' • ')}
                  </div>
                )}
              </div>
            )}

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
            <div className="space-y-4 md:hidden">
              {weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayItems = itemsByDate.get(dateKey) || [];
                return (
                  <div key={dateKey} className="ct-panel overflow-hidden">
                    <DayColumn day={day} items={dayItems} />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Legend */}
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 justify-center text-sm">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">{t('common.movie')}</Badge>
            <span className="text-muted-foreground">{t('common.movies')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500 text-black">{t('common.tvShow')}</Badge>
            <span className="text-muted-foreground">{t('common.tvShows')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary">★ {t('calendar.followed')}</Badge>
            <span className="text-muted-foreground">{t('calendar.inYourList')}</span>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
