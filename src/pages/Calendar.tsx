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
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Film,
  Tv,
  Star,
  Filter,
  Clock,
  Search,
  Grid,
  List,
  CalendarDays,
  Check,
  Plus,
  Minus,
  Info,
  Sparkles,
  AlertCircle,
  Play,
  Volume2,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useUserLists } from '@/contexts/UserListsContext';
import { useFollowedShows } from '@/hooks/useFollowedShows';
import {
  getUpcomingMovies,
  getOnTheAirTV,
  getImageUrl,
  getTVDetails,
  getMediaTitle,
  getMovieDetails,
  getBackdropUrl,
} from '@/services/tmdb';
import { Media, TVEpisodeInfo, TVNetwork } from '@/types/media';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

import SEO from '@/components/SEO';
import { Image } from '@/components/ui/Image';
import { getReleaseTimeInfo, formatReleaseDateTime } from '@/lib/timeUtils';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CalendarItem {
  id: number;
  title: string;
  date: string;
  type: 'movie' | 'tv';
  posterPath: string | null;
  backdropPath: string | null;
  overview?: string;
  isFollowed: boolean;
  voteAverage?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  network?: string;
  popularity?: number;
}

type CalendarTVItem = Media & {
  networks: TVNetwork[];
  next_episode_to_air?: TVEpisodeInfo | null;
  last_episode_to_air?: TVEpisodeInfo | null;
};

function getCalendarItemKey(item: CalendarItem) {
  return [
    item.type,
    item.id,
    item.date.split('T')[0],
    item.seasonNumber ?? '',
    item.episodeNumber ?? '',
  ].join(':');
}

function deduplicateCalendarItems(items: CalendarItem[]) {
  const uniqueItems = new Map<string, CalendarItem>();

  items.forEach((item) => {
    const key = getCalendarItemKey(item);
    const existing = uniqueItems.get(key);

    if (!existing || (!existing.isFollowed && item.isFollowed)) {
      uniqueItems.set(key, item);
    }
  });

  return Array.from(uniqueItems.values());
}

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } = useUserLists();
  const { followedShows, followShow, unfollowShow } = useFollowedShows();
  const todayStart = startOfDay(new Date());

  // Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'agenda'>('week');
  const [calendarRange, setCalendarRange] = useState<'week' | 'month'>('week');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [showOnlyFollowed, setShowOnlyFollowed] = useState(false);
  const [networkFilter, setNetworkFilter] = useState<string>('all');
  const [minRatingFilter, setMinRatingFilter] = useState<string>('all');

  // Modal State
  const [selectedItem, setSelectedItem] = useState<{ id: number; type: 'movie' | 'tv' } | null>(null);
  const [dayModalItems, setDayModalItems] = useState<CalendarItem[] | null>(null);
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);

  // Queries
  const {
    data: upcomingMovies = [],
    isLoading: loadingMovies,
    isError: moviesError,
    error: moviesErrorValue,
    refetch: refetchMovies,
  } = useQuery({
    queryKey: ['upcoming-movies-premium', i18n.language],
    queryFn: async () => {
      const [page1, page2, page3] = await Promise.all([
        getUpcomingMovies(1, i18n.language),
        getUpcomingMovies(2, i18n.language),
        getUpcomingMovies(3, i18n.language),
      ]);
      return [...(page1.results || []), ...(page2.results || []), ...(page3.results || [])];
    },
    staleTime: 1000 * 60 * 30,
  });

  const {
    data: onAirTV = [],
    isLoading: loadingTV,
    isError: tvError,
    error: tvErrorValue,
    refetch: refetchTV,
  } = useQuery<CalendarTVItem[]>({
    queryKey: ['on-air-tv-premium', i18n.language],
    queryFn: async () => {
      const [page1, page2] = await Promise.all([
        getOnTheAirTV(1, i18n.language),
        getOnTheAirTV(2, i18n.language),
      ]);

      const shows = [...(page1.results || []), ...(page2.results || [])];

      // Details retrieval for networks and episode synopses
      const detailedShows = await Promise.all(
        shows.slice(0, 30).map(async (show) => {
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

  // Fetch details for followed TV shows so they populate the calendar dynamically
  const { data: followedShowsDetails = [], isLoading: loadingFollowedDetails } = useQuery({
    queryKey: ['followed-shows-calendar-details', followedShows.map((s) => s.show_id), i18n.language],
    queryFn: async () => {
      if (followedShows.length === 0) return [];
      const results = await Promise.all(
        followedShows.map(async (show) => {
          try {
            const details = await getTVDetails(show.show_id, i18n.language);
            return {
              ...details,
              media_type: 'tv' as const,
            };
          } catch {
            return null;
          }
        })
      );
      return results.filter(Boolean) as CalendarTVItem[];
    },
    enabled: followedShows.length > 0,
    staleTime: 1000 * 60 * 20,
  });

  // Lazy-loaded active item details for details modal
  const { data: detailsData, isLoading: loadingDetails } = useQuery({
    queryKey: ['calendar-item-details-lazy', selectedItem?.type, selectedItem?.id, i18n.language],
    queryFn: async () => {
      if (!selectedItem) return null;
      return selectedItem.type === 'movie'
        ? getMovieDetails(selectedItem.id, i18n.language)
        : getTVDetails(selectedItem.id, i18n.language);
    },
    enabled: !!selectedItem,
    staleTime: 1000 * 60 * 10,
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
        const isInWatch = watchlistMovieIds.has(movie.id);
        if (showOnlyFollowed && !isInWatch) return;

        items.push({
          id: movie.id,
          title: getMediaTitle(movie),
          date: movie.release_date,
          type: 'movie',
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          overview: movie.overview,
          isFollowed: isInWatch,
          voteAverage: movie.vote_average,
          popularity: movie.popularity,
          network: t('calendar.theatricalRelease', 'Theatrical Release'),
        });
      });
    }

    // TV Shows (deduplicated between On-Air and Followed)
    if (mediaTypeFilter !== 'movie') {
      const mergedTV = [...onAirTV];
      const existingIds = new Set(onAirTV.map((show) => show.id));

      followedShowsDetails.forEach((show) => {
        if (!existingIds.has(show.id)) {
          mergedTV.push(show);
        }
      });

      mergedTV.forEach((show) => {
        const nextEp = show.next_episode_to_air;
        const firstAirDate =
          show.first_air_date && !isBefore(parseISO(show.first_air_date), todayStart)
            ? show.first_air_date
            : null;
        const airDate = nextEp?.air_date || firstAirDate;
        if (!airDate) return;

        const isFollowed = followedShowIds.has(show.id) || watchlistTVIds.has(show.id);
        if (showOnlyFollowed && !isFollowed) return;

        const networkName = show.networks?.[0]?.name || t('calendar.unknownChannel', 'Unknown Network');

        items.push({
          id: show.id,
          title: getMediaTitle(show),
          date: airDate,
          type: 'tv',
          posterPath: show.poster_path,
          backdropPath: show.backdrop_path,
          overview: show.overview,
          isFollowed,
          voteAverage: show.vote_average,
          popularity: show.popularity,
          seasonNumber: nextEp?.season_number,
          episodeNumber: nextEp?.episode_number,
          network: networkName,
        });
      });
    }

    return deduplicateCalendarItems(items);
  }, [
    upcomingMovies,
    onAirTV,
    followedShowsDetails,
    mediaTypeFilter,
    showOnlyFollowed,
    watchlistMovieIds,
    watchlistTVIds,
    followedShowIds,
    t,
    todayStart,
  ]);

  // Date ranges
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const startM = startOfMonth(currentDate);
    const endM = endOfMonth(currentDate);
    const startGrid = startOfWeek(startM, { weekStartsOn: 1 });
    const endGrid = endOfWeek(endM, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startGrid, end: endGrid });
  }, [currentDate]);

  // Filters application
  const filteredCalendarItems = useMemo(() => {
    return calendarItems.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesNetwork = networkFilter === 'all' || item.network === networkFilter;
      const matchesRating =
        minRatingFilter === 'all' ||
        (item.voteAverage && item.voteAverage >= parseFloat(minRatingFilter));
      return matchesSearch && matchesNetwork && matchesRating;
    });
  }, [calendarItems, searchQuery, networkFilter, minRatingFilter]);

  // Unique networks list for dropdown
  const uniqueNetworks = useMemo(() => {
    const networks = new Set<string>();
    calendarItems.forEach((item) => {
      if (item.network) {
        networks.add(item.network);
      }
    });
    return Array.from(networks).sort();
  }, [calendarItems]);

  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarItem[]>();
    filteredCalendarItems.forEach((item) => {
      const dateKey = item.date.split('T')[0];
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(item);
    });
    return grouped;
  }, [filteredCalendarItems]);

  const isLoading = loadingMovies || loadingTV || loadingFollowedDetails;
  const calendarLoadingTimedOut = useLoadingTimeout(isLoading, 14000);
  const hasCalendarError = moviesError || tvError;

  const weekRange = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(start, 'MMM d')} — ${format(end, 'MMM d, yyyy')}`;
  }, [currentDate]);

  const monthRange = useMemo(() => {
    return format(currentDate, 'MMMM yyyy');
  }, [currentDate]);

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => (calendarRange === 'month' ? subMonths(prev, 1) : subWeeks(prev, 1)));
  }, [calendarRange]);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => (calendarRange === 'month' ? addMonths(prev, 1) : addWeeks(prev, 1)));
  }, [calendarRange]);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const activeRangeItemsCount = useMemo(() => {
    const targetDays = calendarRange === 'month' ? monthDays : weekDays;
    return targetDays.reduce((total, day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return total + (itemsByDate.get(dateKey)?.length || 0);
    }, 0);
  }, [itemsByDate, weekDays, monthDays, calendarRange]);

  // Choose the highest rated item of the active period as weekly/monthly spotlight
  const spotlightItem = useMemo(() => {
    const targetDays = calendarRange === 'month' ? monthDays : weekDays;
    const activePeriodItems: CalendarItem[] = [];
    
    targetDays.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayItems = itemsByDate.get(dateKey) || [];
      activePeriodItems.push(...dayItems);
    });

    if (activePeriodItems.length === 0) return null;

    // Prioritize followed shows first, then highest popularity/rating
    return [...activePeriodItems].sort((a, b) => {
      if (a.isFollowed && !b.isFollowed) return -1;
      if (!a.isFollowed && b.isFollowed) return 1;
      return (b.voteAverage || 0) - (a.voteAverage || 0);
    })[0];
  }, [itemsByDate, weekDays, monthDays, calendarRange]);

  const calendarSummary = useMemo(() => {
    const movieCount = filteredCalendarItems.filter((item) => item.type === 'movie').length;
    const tvCount = filteredCalendarItems.filter((item) => item.type === 'tv').length;
    const savedCount = filteredCalendarItems.filter((item) => item.isFollowed).length;
    const nextRelease = [...filteredCalendarItems]
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())[0];

    return {
      totalCount: filteredCalendarItems.length,
      movieCount,
      tvCount,
      savedCount,
      nextRelease,
    };
  }, [filteredCalendarItems]);

  // Watchlist & Follow direct togglers
  const handleWatchlistToggle = useCallback(
    (e: React.MouseEvent, item: CalendarItem) => {
      e.stopPropagation();
      e.preventDefault();
      const inWatch = watchlistMovieIds.has(item.id);
      if (inWatch) {
        removeFromWatchlist(item.id, 'movie');
      } else {
        addToWatchlist(item.id, 'movie');
      }
    },
    [watchlistMovieIds, addToWatchlist, removeFromWatchlist]
  );

  const handleFollowToggle = useCallback(
    (e: React.MouseEvent, item: CalendarItem) => {
      e.stopPropagation();
      e.preventDefault();
      const isFollow = followedShowIds.has(item.id);
      if (isFollow) {
        unfollowShow(item.id);
      } else {
        followShow({
          showId: item.id,
          showName: item.title,
          posterPath: item.posterPath,
        });
      }
    },
    [followedShowIds, followShow, unfollowShow]
  );

  // Keyboard activation for clickable (non-button) card elements: Enter or Space
  // fires the same action as a click, matching native button behavior. Space is
  // prevented from scrolling the page.
  const activateOnKey =
    (activate: () => void) => (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    };

  return (
    <>
      <SEO
        title={t('calendar.title')}
        description={t('calendar.subtitle')}
        canonical="https://cinetrekker.vercel.app/calendar"
      />

      <div className="ct-page-shell min-h-screen">
        <div className="page-container pt-20 pb-24 md:pb-12 space-y-8">
          
          {/* Header & Main Info */}
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="ct-panel flex shrink-0 items-center justify-center rounded-2xl p-3 bg-primary/10 border-primary/20">
                <CalendarIcon className="w-8 h-8 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="ct-kicker mb-1">{t('calendar.releaseTimeline', 'Release Timeline')}</p>
                <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{t('calendar.title')}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t('calendar.subtitle')}</p>
                {!user && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sign in to track followed shows and sync your list. Browsing the calendar stays public.
                  </p>
                )}
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex rounded-2xl border border-border/50 bg-card/60 p-1.5 backdrop-blur-sm shadow-sm shrink-0 self-start md:self-auto">
              {(
                [
                  { mode: "week" as const, label: "Week", icon: <CalendarDays className="h-4 w-4" /> },
                  { mode: "month" as const, label: "Month", icon: <Grid className="h-4 w-4" /> },
                  { mode: "agenda" as const, label: "Agenda", icon: <List className="h-4 w-4" /> },
                ] as const
              ).map(({ mode, label, icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setViewMode(mode);
                    if (mode === 'week' || mode === 'month') {
                      setCalendarRange(mode);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                    viewMode === mode
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Visible releases</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <span className="text-3xl font-black tracking-tight text-foreground tabular-nums">{calendarSummary.totalCount}</span>
                  <span className="text-xs text-muted-foreground">{calendarRange === 'month' ? 'This month' : 'This week'}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Movies</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <span className="text-3xl font-black tracking-tight text-primary tabular-nums">{calendarSummary.movieCount}</span>
                  <span className="text-xs text-muted-foreground">Theatrical releases</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">TV episodes</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <span className="text-3xl font-black tracking-tight text-amber-400 tabular-nums">{calendarSummary.tvCount}</span>
                  <span className="text-xs text-muted-foreground">On-air and followed</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Next release</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <span className="text-3xl font-black tracking-tight text-emerald-400 tabular-nums">
                    {calendarSummary.nextRelease ? format(parseISO(calendarSummary.nextRelease.date), 'MMM d') : '—'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {calendarSummary.savedCount} saved in this view
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cinematic Spotlight Hero */}
          {spotlightItem && !isLoading && (
            <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md shadow-lg group">
              {/* Wide backdrop */}
              {spotlightItem.backdropPath && (
                <div className="absolute inset-0 overflow-hidden opacity-20">
                  <img
                    src={getBackdropUrl(spotlightItem.backdropPath, 'w1280') ?? undefined}
                    alt=""
                    className="h-full w-full object-cover blur-[2px] transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
              <div className="relative z-10 flex flex-col md:flex-row gap-6 p-6 md:p-8">
                <div className="relative aspect-[2/3] w-28 md:w-36 shrink-0 overflow-hidden rounded-2xl border border-border/40 shadow-xl">
                  <img
                    src={getImageUrl(spotlightItem.posterPath, 'w342')}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
                      Spotlight Selection
                    </Badge>
                    <Badge className={spotlightItem.type === 'movie' ? "bg-primary" : "bg-amber-500 text-black"}>
                      {spotlightItem.type === 'movie' ? 'Movie' : 'TV Series'}
                    </Badge>
                    {spotlightItem.voteAverage && spotlightItem.voteAverage > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold text-yellow-500">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {spotlightItem.voteAverage.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
                    {spotlightItem.title}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed max-w-2xl">
                    {spotlightItem.overview || 'Synopsis not available.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      onClick={() => setSelectedItem({ id: spotlightItem.id, type: spotlightItem.type })}
                      className="rounded-full gap-1.5"
                    >
                      <Info className="h-4 w-4" />
                      View Details
                    </Button>

                    {spotlightItem.type === 'movie' ? (
                      <Button
                        variant={watchlistMovieIds.has(spotlightItem.id) ? 'destructive' : 'secondary'}
                        onClick={(e) => handleWatchlistToggle(e, spotlightItem)}
                        className="rounded-full"
                      >
                        {watchlistMovieIds.has(spotlightItem.id) ? 'Remove Watchlist' : 'Add Watchlist'}
                      </Button>
                    ) : (
                      <Button
                        variant={followedShowIds.has(spotlightItem.id) ? 'destructive' : 'secondary'}
                        onClick={(e) => handleFollowToggle(e, spotlightItem)}
                        className="rounded-full"
                      >
                        {followedShowIds.has(spotlightItem.id) ? 'Unfollow Show' : 'Follow Show'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Toolbar & Filters */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              
              {/* Date Pager */}
              <div className="flex items-center justify-between md:justify-start gap-4">
                <div className="flex items-center rounded-2xl border border-border/50 bg-card/60 p-1 backdrop-blur-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevious}
                    className="h-9 w-9 rounded-xl"
                    aria-label={
                      calendarRange === 'month'
                        ? t('calendar.previousMonth', 'Previous month')
                        : t('calendar.previousWeek', 'Previous week')
                    }
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="min-w-[150px] text-center text-sm font-black px-2">
                    {calendarRange === 'month' ? monthRange : weekRange}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNext}
                    className="h-9 w-9 rounded-xl"
                    aria-label={
                      calendarRange === 'month'
                        ? t('calendar.nextMonth', 'Next month')
                        : t('calendar.nextWeek', 'Next week')
                    }
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <Button variant="secondary" size="sm" onClick={goToToday} className="rounded-xl font-bold">
                  {t('calendar.today')}
                </Button>
              </div>

              {/* Advanced Filters Trigger/Row */}
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Search Bar */}
                <div className="relative w-full sm:w-48 md:w-56">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search calendar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 rounded-2xl bg-card/60 border-border/50 focus-visible:ring-primary/40 focus:border-primary/50"
                  />
                </div>

                {/* Media Type Filter */}
                <Select value={mediaTypeFilter} onValueChange={(v) => setMediaTypeFilter(v as 'all' | 'movie' | 'tv')}>
                  <SelectTrigger className="w-full sm:w-36 rounded-2xl bg-card/60 border-border/50">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="movie">{t('common.movies')}</SelectItem>
                    <SelectItem value="tv">{t('common.tvShows')}</SelectItem>
                  </SelectContent>
                </Select>

                {/* TV Network Filter */}
                <Select value={networkFilter} onValueChange={setNetworkFilter}>
                  <SelectTrigger className="w-full sm:w-40 rounded-2xl bg-card/60 border-border/50">
                    <SelectValue placeholder="Network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Networks</SelectItem>
                    {uniqueNetworks.map((net) => (
                      <SelectItem key={net} value={net}>
                        {net}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Minimum Rating Filter */}
                <Select value={minRatingFilter} onValueChange={setMinRatingFilter}>
                  <SelectTrigger className="w-full sm:w-32 rounded-2xl bg-card/60 border-border/50">
                    <SelectValue placeholder="Min Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="8">★ 8.0+</SelectItem>
                    <SelectItem value="7">★ 7.0+</SelectItem>
                    <SelectItem value="6">★ 6.0+</SelectItem>
                  </SelectContent>
                </Select>

                {user && (
                  <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-card/60 px-4 py-2 backdrop-blur-sm w-full sm:w-auto">
                    <Switch id="followed-shows-only" checked={showOnlyFollowed} onCheckedChange={setShowOnlyFollowed} />
                    <Label htmlFor="followed-shows-only" className="cursor-pointer text-xs font-bold text-muted-foreground">
                      Followed
                    </Label>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Main Views Engine */}
          {isLoading && !calendarLoadingTimedOut ? (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
              ))}
            </div>
          ) : hasCalendarError || calendarLoadingTimedOut ? (
            <div className="ct-panel mx-auto max-w-xl p-8 text-center bg-card/60 backdrop-blur-sm border-border/50 rounded-3xl">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive/80 mb-4" />
              <h2 className="text-xl font-bold text-foreground">{t('calendar.unableToLoad', 'Unable to load calendar')}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {calendarLoadingTimedOut
                  ? t('calendar.loadingTooLong', 'Loading took too long. Please try again.')
                  : (moviesErrorValue as Error | undefined)?.message ||
                    (tvErrorValue as Error | undefined)?.message ||
                    t('calendar.fetchError', 'Something went wrong while fetching releases.')}
              </p>
              <div className="mt-6">
                <Button onClick={() => { void refetchMovies(); void refetchTV(); }} className="rounded-full">
                  {t('common.retry')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {activeRangeItemsCount === 0 && (
                <div className="ct-panel p-10 text-center rounded-3xl bg-card/40 border-dashed border-border/80">
                  <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h2 className="text-lg font-bold text-foreground">{t('calendar.noReleasesWeek', 'No releases this period')}</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {t('calendar.noReleasesWeekDesc', 'Check other dates or clear filters to view releases.')}
                  </p>
                  {calendarSummary.nextRelease && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Next visible release: {format(parseISO(calendarSummary.nextRelease.date), 'PPP')}
                    </p>
                  )}
                  {(searchQuery || networkFilter !== 'all' || minRatingFilter !== 'all' || showOnlyFollowed) && (
                    <div className="mt-5">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSearchQuery('');
                          setNetworkFilter('all');
                          setMinRatingFilter('all');
                          setShowOnlyFollowed(false);
                        }}
                        className="rounded-full"
                      >
                        Reset Filters
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────── Week View ────────────────── */}
              {viewMode === 'week' && activeRangeItemsCount > 0 && (
                <div className="ct-panel overflow-hidden rounded-3xl border border-border/40 bg-card/30">
                  <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-7 md:divide-y-0 md:divide-x">
                    {weekDays.map((day) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayItems = itemsByDate.get(dateKey) || [];
                      const isCurrentDay = isToday(day);
                      const isPastDay = isBefore(day, new Date()) && !isCurrentDay;
                      const sortedItems = [...dayItems].sort(
                        (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
                      );

                      return (
                        <div key={dateKey} className="flex flex-col min-w-0">
                          {/* Day Header */}
                          <div
                            className={cn(
                              "border-b border-border/40 p-4 text-center md:sticky md:top-0 z-20 backdrop-blur-md",
                              isCurrentDay ? "bg-primary/10" : isPastDay ? "bg-muted/30" : "bg-card/40"
                            )}
                          >
                            <span className={cn("text-[10px] font-black uppercase tracking-widest block mb-0.5", isCurrentDay ? "text-primary" : "text-muted-foreground")}>
                              {format(day, 'EEEE')}
                            </span>
                            <span className={cn(
                              "inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-black transition-all",
                              isCurrentDay ? "bg-primary text-primary-foreground shadow-lg" : "text-foreground"
                            )}>
                              {format(day, 'd')}
                            </span>
                            <span className="text-[10px] block text-muted-foreground font-semibold mt-1">
                              {format(day, 'MMM')}
                            </span>
                          </div>

                          {/* Day Items Stack */}
                          <div className={cn(
                            "flex-1 p-3 space-y-3 min-h-[120px] md:min-h-[380px] transition-colors",
                            isCurrentDay ? "bg-primary/5" : isPastDay ? "bg-muted/10" : "bg-background/10"
                          )}>
                            {sortedItems.length > 0 ? (
                              sortedItems.map((item) => (
                                <div
                                  key={`${item.type}-${item.id}`}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`View details for ${item.title}`}
                                  onClick={() => setSelectedItem({ id: item.id, type: item.type })}
                                  onKeyDown={activateOnKey(() =>
                                    setSelectedItem({ id: item.id, type: item.type }),
                                  )}
                                  className={cn(
                                    "group relative flex items-center gap-3 rounded-xl border border-border/50 bg-card p-2.5 transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                    item.isFollowed && "ring-1 ring-primary/40"
                                  )}
                                >
                                  {/* Card Quick-Action Overlay */}
                                  <div className="absolute right-2 top-2 z-10 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100">
                                    {item.type === 'movie' ? (
                                      <button
                                        type="button"
                                        onClick={(e) => handleWatchlistToggle(e, item)}
                                        aria-label={
                                          watchlistMovieIds.has(item.id)
                                            ? t("actions.removeFromWatchlistTitle", "Remove {{title}} from watchlist", { title: item.title })
                                            : t("actions.addToWatchlistTitle", "Add {{title}} to watchlist", { title: item.title })
                                        }
                                        className={cn(
                                          "flex h-11 w-11 items-center justify-center rounded-full shadow-md backdrop-blur border text-white transition",
                                          watchlistMovieIds.has(item.id)
                                            ? "bg-destructive border-destructive/20 hover:bg-destructive/80"
                                            : "bg-primary border-primary/20 hover:bg-primary/80"
                                        )}
                                      >
                                        {watchlistMovieIds.has(item.id) ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => handleFollowToggle(e, item)}
                                        aria-label={
                                          followedShowIds.has(item.id)
                                            ? t("calendar.unfollowTitle", "Unfollow {{title}}", { title: item.title })
                                            : t("calendar.followTitle", "Follow {{title}}", { title: item.title })
                                        }
                                        className={cn(
                                          "flex h-11 w-11 items-center justify-center rounded-full shadow-md backdrop-blur border text-white transition",
                                          followedShowIds.has(item.id)
                                            ? "bg-destructive border-destructive/20 hover:bg-destructive/80"
                                            : "bg-amber-500 border-amber-500/20 hover:bg-amber-500/80"
                                        )}
                                      >
                                        <Star className={cn("h-4 w-4", followedShowIds.has(item.id) && "fill-current")} />
                                      </button>
                                    )}
                                  </div>

                                  <div className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg border border-border/40">
                                    <Image
                                      src={getImageUrl(item.posterPath, 'w154')}
                                      alt=""
                                      width={154}
                                      height={231}
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      loading="lazy"
                                      showSkeleton
                                    />
                                    {item.voteAverage && item.voteAverage > 0 && (
                                      <div className="absolute bottom-0.5 right-0.5 flex h-4 items-center justify-center rounded bg-black/80 px-1 text-[8px] font-black text-yellow-500">
                                        {item.voteAverage.toFixed(1)}
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <Badge className={cn(
                                        "px-1 py-0 text-[8px] font-bold border-0 leading-none",
                                        item.type === 'movie' ? "bg-primary text-primary-foreground" : "bg-amber-500 text-black"
                                      )}>
                                        {item.type === 'movie' ? 'Movie' : 'TV'}
                                      </Badge>
                                      {item.isFollowed && (
                                        <Star className="h-3 w-3 fill-primary text-primary" />
                                      )}
                                    </div>
                                    <h4 className="truncate text-xs font-bold leading-tight group-hover:text-primary transition-colors">
                                      {item.title}
                                    </h4>
                                    {item.type === 'tv' && item.seasonNumber && (
                                      <p className="text-[10px] text-muted-foreground">
                                        S{item.seasonNumber} E{item.episodeNumber}
                                      </p>
                                    )}
                                    <p className="truncate text-[9px] text-muted-foreground">
                                      {item.network}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center py-12 text-center opacity-30">
                                <CalendarIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
                                <p className="text-[10px] font-bold text-muted-foreground">No releases</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ────────────────── Month View ────────────────── */}
              {viewMode === 'month' && activeRangeItemsCount > 0 && (
                <div className="ct-panel overflow-hidden rounded-3xl border border-border/40 bg-card/30">
                  {/* Grid Headers */}
                  <div className="grid grid-cols-7 border-b border-border/40 text-center bg-card/60 py-3 font-bold text-xs text-muted-foreground">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>

                  {/* Grid cells */}
                  <div className="grid grid-cols-7 divide-y divide-x divide-border/40">
                    {monthDays.map((day) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayItems = itemsByDate.get(dateKey) || [];
                      const isCurrentDay = isToday(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);

                      return (
                        <div
                          key={dateKey}
                          className={cn(
                            "min-h-[85px] sm:min-h-[120px] p-2 flex flex-col justify-between border-b border-r border-border/40 transition-all hover:bg-muted/5 relative",
                            !isCurrentMonth && "opacity-30 bg-muted/5",
                            isCurrentDay && "bg-primary/5 ring-1 ring-primary/20"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black",
                                isCurrentDay && "bg-primary text-primary-foreground shadow-sm"
                              )}
                            >
                              {format(day, 'd')}
                            </span>
                            {dayItems.length > 0 && (
                              <span className="text-[9px] text-muted-foreground font-black hidden sm:inline">
                                {dayItems.length} {dayItems.length === 1 ? 'release' : 'releases'}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex-1 flex flex-col justify-end space-y-1">
                            {/* Desktop: show up to 2 items list */}
                            <div className="hidden sm:block space-y-1">
                              {dayItems.slice(0, 2).map((item) => (
                                <button
                                  key={`${item.type}-${item.id}`}
                                  onClick={() => setSelectedItem({ id: item.id, type: item.type })}
                                  className={cn(
                                    "w-full text-left truncate text-[10px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-1 transition",
                                    item.type === 'movie'
                                      ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15"
                                      : "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/15"
                                  )}
                                >
                                  {item.type === 'movie' ? <Film className="h-2.5 w-2.5 shrink-0" /> : <Tv className="h-2.5 w-2.5 shrink-0" />}
                                  <span className="truncate">{item.title}</span>
                                </button>
                              ))}
                              {dayItems.length > 2 && (
                                <button
                                  onClick={() => {
                                    setDayModalItems(dayItems);
                                    setDayModalDate(day);
                                  }}
                                  className="w-full text-center text-[9px] font-bold text-muted-foreground hover:text-foreground py-0.5 bg-muted/20 rounded border border-border/40"
                                >
                                  + {dayItems.length - 2} more
                                </button>
                              )}
                            </div>

                            {/* Mobile: mini dots */}
                            <div className="flex sm:hidden gap-1 justify-center mt-1">
                              {dayItems.slice(0, 4).map((item, idx) => (
                                <div
                                  key={idx}
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    item.type === 'movie' ? "bg-primary" : "bg-amber-500"
                                  )}
                                />
                              ))}
                              {dayItems.length > 4 && (
                                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ────────────────── Agenda View ────────────────── */}
              {viewMode === 'agenda' && activeRangeItemsCount > 0 && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {(calendarRange === 'month' ? monthDays : weekDays).map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayItems = itemsByDate.get(dateKey) || [];
                    if (dayItems.length === 0) return null;

                    const isCurrentDay = isToday(day);

                    return (
                      <div key={dateKey} className="relative pl-6 md:pl-28 group">
                        
                        {/* Desktop Left-Sticky Date Panel */}
                        <div className="hidden md:block absolute left-0 top-1.5 text-right w-20">
                          <span className={cn("text-xs font-black uppercase tracking-wider block", isCurrentDay ? "text-primary animate-pulse" : "text-muted-foreground")}>
                            {format(day, 'EEE')}
                          </span>
                          <span className={cn(
                            "inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-black mt-1",
                            isCurrentDay ? "bg-primary text-primary-foreground shadow-lg" : "text-foreground/90"
                          )}>
                            {format(day, 'd')}
                          </span>
                          <span className="text-[10px] block text-muted-foreground/60 font-semibold mt-1">
                            {format(day, 'MMM')}
                          </span>
                        </div>

                        {/* Timeline Connector Line */}
                        <div className="absolute left-3 md:left-[96px] top-4 bottom-0 w-0.5 bg-border/40 group-last:bg-transparent" />
                        <div className={cn(
                          "absolute left-2.5 md:left-[94px] top-1.5 h-2 w-2 rounded-full border-2",
                          isCurrentDay ? "bg-primary border-primary" : "bg-muted-foreground/30 border-muted-foreground/20"
                        )} />

                        {/* Mobile Date Header */}
                        <div className="flex md:hidden items-center gap-2 mb-3">
                          <span className={cn("text-sm font-bold uppercase", isCurrentDay ? "text-primary" : "text-foreground")}>
                            {format(day, 'EEEE, MMM d')}
                          </span>
                          {isCurrentDay && <Badge className="bg-primary text-primary-foreground text-[8px] font-bold">Today</Badge>}
                        </div>

                        {/* Wide Releases Cards */}
                        <div className="space-y-4">
                          {dayItems.map((item) => (
                            <div
                              key={`${item.type}-${item.id}`}
                              role="button"
                              tabIndex={0}
                              aria-label={`View details for ${item.title}`}
                              onClick={() => setSelectedItem({ id: item.id, type: item.type })}
                              onKeyDown={activateOnKey(() =>
                                setSelectedItem({ id: item.id, type: item.type }),
                              )}
                              className={cn(
                                "group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-4 transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer flex flex-col sm:flex-row gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                item.isFollowed && "ring-1 ring-primary/40"
                              )}
                            >
                              {/* Backdrop backdrop-image panel */}
                              {item.backdropPath && (
                                <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-[0.05] overflow-hidden pointer-events-none">
                                  <img
                                    src={getBackdropUrl(item.backdropPath, 'w300') ?? undefined}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}

                              <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-xl border border-border/40 shadow-sm">
                                <Image
                                  src={getImageUrl(item.posterPath, 'w185')}
                                  alt=""
                                  width={185}
                                  height={278}
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                />
                              </div>

                              <div className="flex-1 space-y-2 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className={item.type === 'movie' ? "bg-primary" : "bg-amber-500 text-black"}>
                                    {item.type === 'movie' ? 'Movie' : 'TV Series'}
                                  </Badge>
                                  {item.voteAverage && item.voteAverage > 0 && (
                                    <span className="flex items-center gap-1 text-xs font-bold text-yellow-500">
                                      <Star className="h-3 w-3 fill-current" />
                                      {item.voteAverage.toFixed(1)}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {item.network}
                                  </span>
                                </div>

                                <h3 className="text-lg font-black tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
                                  {item.title}
                                </h3>

                                {item.type === 'tv' && item.seasonNumber && (
                                  <p className="text-xs font-bold text-muted-foreground/80">
                                    Season {item.seasonNumber} • Episode {item.episodeNumber}
                                  </p>
                                )}

                                <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed max-w-2xl pr-4">
                                  {item.overview || 'Overview details not available.'}
                                </p>
                              </div>

                              {/* Card Actions Panel */}
                              <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0">
                                {item.type === 'movie' ? (
                                  <Button
                                    variant={watchlistMovieIds.has(item.id) ? 'destructive' : 'secondary'}
                                    size="sm"
                                    onClick={(e) => handleWatchlistToggle(e, item)}
                                    className="rounded-full w-full sm:w-auto"
                                  >
                                    {watchlistMovieIds.has(item.id) ? 'Remove' : 'Watchlist'}
                                  </Button>
                                ) : (
                                  <Button
                                    variant={followedShowIds.has(item.id) ? 'destructive' : 'secondary'}
                                    size="sm"
                                    onClick={(e) => handleFollowToggle(e, item)}
                                    className="rounded-full w-full sm:w-auto"
                                  >
                                    {followedShowIds.has(item.id) ? 'Unfollow' : 'Follow'}
                                  </Button>
                                )}
                              </div>

                            </div>
                          ))}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Legend */}
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 justify-center text-xs border-t border-border/40 pt-8">
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

      {/* ────────────────── Day Releases Popover Modal ────────────────── */}
      <Dialog open={!!dayModalItems} onOpenChange={(open) => { if (!open) setDayModalItems(null); }}>
        <DialogContent className="max-w-md rounded-2xl border border-border/50 bg-card/95 p-6 shadow-2xl backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
              Releases on {dayModalDate && format(dayModalDate, 'MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {dayModalItems?.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${item.title}`}
                onClick={() => {
                  setDayModalItems(null);
                  setSelectedItem({ id: item.id, type: item.type });
                }}
                onKeyDown={activateOnKey(() => {
                  setDayModalItems(null);
                  setSelectedItem({ id: item.id, type: item.type });
                })}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-2 hover:bg-muted/40 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="relative aspect-[2/3] w-10 overflow-hidden rounded-lg border border-border/40">
                  <img src={getImageUrl(item.posterPath, 'w92')} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-bold text-foreground">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.network}</p>
                </div>
                <Badge className={item.type === 'movie' ? "bg-primary" : "bg-amber-500 text-black"}>
                  {item.type === 'movie' ? 'Movie' : 'TV'}
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ────────────────── Active Item Details Modal ────────────────── */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-w-xl overflow-hidden rounded-2xl border border-border/50 bg-card/95 p-0 shadow-2xl backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Release Details</DialogTitle>
          </DialogHeader>
          {loadingDetails ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : detailsData ? (
            <div className="relative">
              {/* Cover backdrop image */}
              {detailsData.backdrop_path && (
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={getBackdropUrl(detailsData.backdrop_path, 'w780') ?? undefined}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-transparent" />
                </div>
              )}

              <div className={cn("p-6 space-y-4", !detailsData.backdrop_path && "pt-8")}>
                <div className="flex items-start gap-4">
                  <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl border border-border/50 shadow-md">
                    <img
                      src={getImageUrl(detailsData.poster_path, 'w185')}
                      alt={detailsData.title || detailsData.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap gap-2">
                      <Badge className={selectedItem?.type === 'movie' ? "bg-primary" : "bg-amber-500 text-black"}>
                        {selectedItem?.type === 'movie' ? 'Movie' : 'TV Show'}
                      </Badge>
                      {detailsData.vote_average > 0 && (
                        <Badge variant="outline" className="gap-1 text-yellow-500 border-yellow-500/20 bg-yellow-500/5">
                          <Star className="h-3 w-3 fill-current" />
                          {detailsData.vote_average.toFixed(1)}
                        </Badge>
                      )}
                    </div>

                    <h2 className="text-xl font-black tracking-tight text-foreground truncate">
                      {detailsData.title || detailsData.name}
                    </h2>

                    {detailsData.tagline && (
                      <p className="text-xs italic text-muted-foreground truncate">
                        "{detailsData.tagline}"
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {selectedItem?.type === 'movie'
                        ? `Released: ${detailsData.release_date}`
                        : `First Aired: ${detailsData.first_air_date}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Overview
                  </h3>
                  <p className="text-sm text-foreground/90 leading-relaxed max-h-32 overflow-y-auto pr-1">
                    {detailsData.overview || 'No synopsis available.'}
                  </p>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-border/40 bg-muted/20 p-3 text-xs">
                  {selectedItem?.type === 'movie' ? (
                    <>
                      <div>
                        <span className="text-muted-foreground block">Runtime</span>
                        <span className="font-bold">{detailsData.runtime ? `${detailsData.runtime} mins` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Genres</span>
                        <span className="font-bold truncate block">
                          {detailsData.genres?.map((g) => g.name).join(', ') || 'N/A'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-muted-foreground block">Network</span>
                        <span className="font-bold truncate block">{detailsData.networks?.[0]?.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Seasons</span>
                        <span className="font-bold">{detailsData.number_of_seasons || 'N/A'} ({detailsData.number_of_episodes || 0} episodes)</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Actions Panel */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {selectedItem?.type === 'movie' ? (
                    <Button
                      onClick={() => {
                        const inWatch = watchlistMovieIds.has(detailsData.id);
                        if (inWatch) {
                          removeFromWatchlist(detailsData.id, 'movie');
                        } else {
                          addToWatchlist(detailsData.id, 'movie');
                        }
                      }}
                      variant={watchlistMovieIds.has(detailsData.id) ? 'destructive' : 'default'}
                      className="rounded-full px-5"
                    >
                      {watchlistMovieIds.has(detailsData.id) ? 'Remove Watchlist' : 'Add to Watchlist'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        const followed = followedShowIds.has(detailsData.id);
                        if (followed) {
                          unfollowShow(detailsData.id);
                        } else {
                          followShow({
                            showId: detailsData.id,
                            showName: detailsData.name || detailsData.title || 'Unknown Show',
                            posterPath: detailsData.poster_path ?? null,
                          });
                        }
                      }}
                      variant={followedShowIds.has(detailsData.id) ? 'destructive' : 'default'}
                      className="rounded-full px-5"
                    >
                      {followedShowIds.has(detailsData.id) ? 'Unfollow Show' : 'Follow Show'}
                    </Button>
                  )}

                  <Link to={`/${selectedItem?.type}/${selectedItem?.id}`} className="ml-auto" onClick={() => setSelectedItem(null)}>
                    <Button variant="outline" className="rounded-full">
                      View Full Details
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">Failed to load details.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
