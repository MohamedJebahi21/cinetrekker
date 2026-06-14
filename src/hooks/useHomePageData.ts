import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { scheduleIdleTask } from "@/lib/idleCallback";
import { MOVIE_GENRES, TV_GENRES } from "@/data/genres";
import {
  discoverMovies,
  discoverTV,
  getNowPlayingMovies,
  getTrending,
} from "@/services/tmdb";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { useLastViewed } from "@/hooks/useLastViewed";
import type { Media } from "@/types/media";
import { enrichMediaItems } from "@/lib/mediaEnrichment";

type UserListEntry = {
  mediaId: number;
  media_type?: "movie" | "tv";
  mediaType?: "movie" | "tv";
  genre_ids?: number[];
  origin_country?: string[];
  production_countries?: Array<{ iso_3166_1?: string }>;
  watchedAt?: string;
  addedAt?: string;
};

type UseHomePageDataOptions = {
  language: string;
  watched: UserListEntry[];
  watchlist: UserListEntry[];
};

export function useHomePageData({
  language,
  watched,
  watchlist,
}: UseHomePageDataOptions) {
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const { lastViewed } = useLastViewed();
  const includeAdult = !(strictFiltering || moderateFiltering);

  const lastWatched = useMemo(() => {
    if (watched.length === 0) return null;

    const toTimestamp = (item: UserListEntry) => {
      const raw = item.watchedAt ?? item.addedAt;
      if (!raw) return 0;
      const parsed = new Date(raw).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return watched.reduce<UserListEntry | null>((latest, item) => {
      if (!latest) return item;
      return toTimestamp(item) >= toTimestamp(latest) ? item : latest;
    }, null);
  }, [watched]);
  const lastGenreId = lastWatched?.genre_ids?.[0] || null;
  const lastGenreName =
    lastWatched?.media_type === "movie"
      ? MOVIE_GENRES.find((genre) => genre.id === lastGenreId)?.name
      : TV_GENRES.find((genre) => genre.id === lastGenreId)?.name;

  const shouldGateRecommendations =
    watched.length === 0 && watchlist.length === 0 && !lastViewed;

  const [discoverTab, setDiscoverTab] = useState<
    "trending-day" | "trending-week" | "new-releases"
  >("trending-day");
  const [deferredEnabled, setDeferredEnabled] = useState(false);

  useEffect(() => {
    setDeferredEnabled(false);

    const { cancel } = scheduleIdleTask(() => setDeferredEnabled(true), {
      timeout: 1200,
    });

    return cancel;
  }, [language]);

  const moreInGenreQuery = useQuery({
    queryKey: ["more-in-genre", lastGenreId, language],
    queryFn: async () => {
      if (!lastGenreId || !lastWatched) return [];

      const params = {
        with_genres: String(lastGenreId),
        sort_by: "popularity.desc",
        page: 1,
      };

      const response =
        lastWatched.media_type === "movie"
          ? await discoverMovies(params, language)
          : await discoverTV(params, language);

      return response.results || [];
    },
    enabled: !!lastGenreId,
  });

  const criticalDataQuery = useQuery({
    queryKey: ["home-critical", language, includeAdult],
    queryFn: async () => {
      const [newReleasesData, trendingWeekData] = await Promise.all([
        getNowPlayingMovies(1, language, includeAdult),
        getTrending("all", "week", language, 1, includeAdult),
      ]);

      return {
        newReleases: newReleasesData,
        trendingWeek: trendingWeekData,
      };
    },
  });

  const watchlistPreviewQuery = useQuery({
    queryKey: [
      "home-watchlist-preview",
      watchlist.map((item) => `${item.mediaType ?? item.media_type}-${item.mediaId}`),
      language,
    ],
    queryFn: async () => {
      return enrichMediaItems(watchlist.slice(0, 10), {
        language,
        getReference: (item) => ({
          mediaId: item.mediaId,
          mediaType: item.mediaType ?? item.media_type ?? "movie",
        }),
        logScope: "home-watchlist-preview",
      }) as Promise<Media[]>;
    },
    enabled: watchlist.length > 0,
  });

  const trendingDayQuery = useQuery({
    queryKey: ["trending", "day", language, includeAdult],
    queryFn: () => getTrending("all", "day", language, 1, includeAdult),
    enabled: deferredEnabled,
  });

  const excludedIds = useMemo(
    () => new Set([...watched, ...watchlist].map((item) => item.mediaId)),
    [watched, watchlist],
  );

  const filteredGenreItems = useMemo(
    () =>
      ((moreInGenreQuery.data as Media[] | undefined) || [])
        .filter((media) => !excludedIds.has(media.id))
        .slice(0, 12),
    [excludedIds, moreInGenreQuery.data],
  );

  const hasDeferredErrors = Boolean(
    trendingDayQuery.error,
  );

  return {
    includeAdult,
    shouldGateRecommendations,
    discoverTab,
    setDiscoverTab,
    deferredEnabled,
    lastGenreId,
    lastGenreName,
    filteredGenreItems,
    moreInGenreQuery,
    criticalDataQuery,
    watchlistPreviewQuery,
    trendingDayQuery,
    hasDeferredErrors,
  };
}
