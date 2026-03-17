import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  getTrending,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  getTopRatedTV,
} from "@/services/tmdb";
import { MediaSection } from "@/components/MediaSection";
import { MediaCarousel } from "@/components/MediaCarousel";
import { MediaCardSkeleton } from "@/components/MediaCard";
import { HeroSection } from "@/components/HeroSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SEO from "@/components/SEO";
import { useContentPolicy } from "@/contexts/content-policy-context";

const BecauseYouLiked = lazy(() =>
  import("@/components/BecauseYouLiked").then((mod) => ({
    default: mod.BecauseYouLiked,
  })),
);
const ContinueWatching = lazy(() =>
  import("@/components/ContinueWatching").then((mod) => ({
    default: mod.ContinueWatching,
  })),
);
const WatchedShowsNewEpisodes = lazy(() =>
  import("@/components/WatchedShowsNewEpisodes").then((mod) => ({
    default: mod.WatchedShowsNewEpisodes,
  })),
);
const RecentlyAddedMovies = lazy(() =>
  import("@/components/RecentlyAddedMovies").then((mod) => ({
    default: mod.RecentlyAddedMovies,
  })),
);

function TrendingSectionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <MediaCardSkeleton
          key={index}
          delay={index * 70}
          className="border-white/5 bg-card/40"
        />
      ))}
    </div>
  );
}

export default function Index() {
  const { t, i18n } = useTranslation();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;

  // State for tab selections
  const [topThisWeekType, setTopThisWeekType] = useState<"movie" | "tv">(
    "movie",
  );
  const [topRatedType, setTopRatedType] = useState<"movie" | "tv">("movie");
  const [popularType, setPopularType] = useState<"movie" | "tv">("movie");

  const [deferredEnabled, setDeferredEnabled] = useState(false);

  const {
    data: criticalData,
    isLoading: loadingCritical,
    error: criticalError,
  } = useQuery({
    queryKey: ["home-critical", language, includeAdult],
    queryFn: async () => {
      const [popularMoviesData, trendingWeekData] = await Promise.all([
        getPopularMovies(1, language, includeAdult),
        getTrending("all", "week", language, 1, includeAdult),
      ]);

      return {
        popularMovies: popularMoviesData,
        trendingWeek: trendingWeekData,
      };
    },
  });

  useEffect(() => {
    setDeferredEnabled(false);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    const enableDeferred = () => setDeferredEnabled(true);

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(enableDeferred, { timeout: 1200 });
    } else {
      timeoutId = globalThis.setTimeout(enableDeferred, 0);
    }

    return () => {
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [language]);

  const {
    data: trendingMoviesWeek,
    isLoading: loadingMoviesWeek,
    error: trendingMoviesWeekError,
  } = useQuery({
    queryKey: ["trending", "movie", "week", language, includeAdult],
    queryFn: () => getTrending("movie", "week", language, 1, includeAdult),
    enabled: deferredEnabled,
  });

  const {
    data: trendingTVWeek,
    isLoading: loadingTVWeek,
    error: trendingTVWeekError,
  } = useQuery({
    queryKey: ["trending", "tv", "week", language, includeAdult],
    queryFn: () => getTrending("tv", "week", language, 1, includeAdult),
    enabled: deferredEnabled,
  });

  const {
    data: popularTV,
    isLoading: loadingPopularTV,
    error: popularTVError,
  } = useQuery({
    queryKey: ["popular", "tv", language, includeAdult],
    queryFn: () => getPopularTV(1, language, includeAdult),
    enabled: deferredEnabled,
  });

  const {
    data: topRatedMovies,
    isLoading: loadingTopRatedMovies,
    error: topRatedMoviesError,
  } = useQuery({
    queryKey: ["top-rated", "movie", language, includeAdult],
    queryFn: () => getTopRatedMovies(1, language, includeAdult),
    enabled: deferredEnabled,
  });

  const {
    data: topRatedTV,
    isLoading: loadingTopRatedTV,
    error: topRatedTVError,
  } = useQuery({
    queryKey: ["top-rated", "tv", language, includeAdult],
    queryFn: () => getTopRatedTV(1, language, includeAdult),
    enabled: deferredEnabled,
  });

  const {
    data: trendingDay,
    isLoading: loadingDay,
    error: trendingDayError,
  } = useQuery({
    queryKey: ["trending", "day", language, includeAdult],
    queryFn: () => getTrending("all", "day", language, 1, includeAdult),
    enabled: deferredEnabled,
  });

  const popularMovies = criticalData?.popularMovies;
  const trendingWeek = criticalData?.trendingWeek;
  const loadingPopularMovies = loadingCritical;
  const loadingWeek = loadingCritical;

  const hasDeferredErrors = Boolean(
    trendingMoviesWeekError ||
    trendingTVWeekError ||
    popularTVError ||
    topRatedMoviesError ||
    topRatedTVError ||
    trendingDayError,
  );

  return (
    <div className="min-h-screen">
      <SEO
        title="CineTrekker - Track Your Movies & TV Shows"
        description="Discover trending movies and TV shows, track your watchlist, and get personalized recommendations."
        canonical="https://cinetrekker.vercel.app"
      />
      {/* High-Conversion Hero Section */}
      <HeroSection />

      {/* AI Movie Scout removed per request */}

      <div className="page-container space-y-8 pb-24 md:pb-0">
        {criticalError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {t(
              "common.error",
              "Something went wrong loading featured content. Please try again.",
            )}
          </div>
        )}

        {hasDeferredErrors && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
            {t(
              "common.error",
              "Some sections failed to load. You can keep browsing and retry shortly.",
            )}
          </div>
        )}

        {/* Personalized Recommendations removed */}

        {/* Phase 3: "Because You Liked" personalized row */}
        {deferredEnabled && (
          <Suspense fallback={null}>
            <ContinueWatching />
          </Suspense>
        )}

        {/* Phase 3: "Because You Liked" personalized row */}
        {deferredEnabled && (
          <Suspense fallback={null}>
            <BecauseYouLiked />
          </Suspense>
        )}

        {/* Did You Watch? - New episodes for watched TV shows */}
        {deferredEnabled && (
          <Suspense fallback={null}>
            <WatchedShowsNewEpisodes />
          </Suspense>
        )}

        {/* Recently Added Movies */}
        {deferredEnabled && (
          <Suspense fallback={null}>
            <RecentlyAddedMovies />
          </Suspense>
        )}

        {/* New Episodes Section removed per UI cleanup */}

        {/* Top This Week - Movies/Series Toggle */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <h2 className="section-title mb-0">
              {t("home.topThisWeek") || "Top This Week"}
            </h2>
            <div className="flex gap-2 bg-card/50 border border-white/5 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setTopThisWeekType("movie")}
                aria-label={t("home.topMoviesWeek") || "Show top movies this week"}
                className={`px-4 py-2 rounded text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  topThisWeekType === "movie"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("common.movies")}
              </button>
              <button
                type="button"
                onClick={() => setTopThisWeekType("tv")}
                aria-label={t("home.topSeriesWeek") || "Show top series this week"}
                className={`px-4 py-2 rounded text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  topThisWeekType === "tv"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("common.tvShows")}
              </button>
            </div>
          </div>
          {topThisWeekType === "movie" && (
            <MediaCarousel
              title={t("home.topMoviesWeek")}
              items={trendingMoviesWeek?.results || []}
              loading={!deferredEnabled || loadingMoviesWeek}
              showMoreLink="/search?type=movie"
            />
          )}
          {topThisWeekType === "tv" && (
            <MediaCarousel
              title={t("home.topSeriesWeek")}
              items={trendingTVWeek?.results || []}
              loading={!deferredEnabled || loadingTVWeek}
              showMoreLink="/search?type=tv"
            />
          )}
        </section>

        {/* Top Rated - Movies/Series Toggle */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <h2 className="section-title mb-0">
              {t("home.topRated") || "Top Rated"}
            </h2>
            <div className="flex gap-2 bg-card/50 border border-white/5 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setTopRatedType("movie")}
                aria-label={t("home.topRatedMovies") || "Show top rated movies"}
                className={`px-4 py-2 rounded text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  topRatedType === "movie"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("common.movies")}
              </button>
              <button
                type="button"
                onClick={() => setTopRatedType("tv")}
                aria-label={t("home.topRatedSeries") || "Show top rated series"}
                className={`px-4 py-2 rounded text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  topRatedType === "tv"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("common.tvShows")}
              </button>
            </div>
          </div>
          {topRatedType === "movie" && (
            <MediaSection
              title={t("home.topRatedMovies") || "Top Rated Movies"}
              items={topRatedMovies?.results || []}
              loading={!deferredEnabled || loadingTopRatedMovies}
              showMoreLink="/search?sort=vote_average.desc&type=movie"
            />
          )}
          {topRatedType === "tv" && (
            <MediaSection
              title={t("home.topRatedSeries") || "Top Rated Series"}
              items={topRatedTV?.results || []}
              loading={!deferredEnabled || loadingTopRatedTV}
              showMoreLink="/search?sort=vote_average.desc&type=tv"
            />
          )}
        </section>

        {/* Trending Section with Tabs */}
        <section>
          <Tabs defaultValue="day" className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <h2 className="section-title mb-0">{t("home.trending")}</h2>
              <TabsList className="bg-card/50 border border-white/5">
                <TabsTrigger
                  value="day"
                  className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {t("home.trendingToday")}
                </TabsTrigger>
                <TabsTrigger
                  value="week"
                  className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {t("home.trendingWeek")}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="day" className="mt-0">
              {!deferredEnabled || loadingDay ? (
                <TrendingSectionSkeleton />
              ) : (
                <MediaSection
                  title={t("home.trendingToday")}
                  items={trendingDay?.results || []}
                  showMoreLink="/search?sort=popularity.desc"
                />
              )}
            </TabsContent>

            <TabsContent value="week" className="mt-0">
              {loadingWeek ? (
                <TrendingSectionSkeleton />
              ) : (
                <MediaSection
                  title={t("home.trendingWeek")}
                  items={trendingWeek?.results || []}
                  showMoreLink="/search?sort=popularity.desc"
                />
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* Popular - Movies/Series Toggle */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <h2 className="section-title mb-0">
              {t("home.popular") || "Popular"}
            </h2>
            <div className="flex gap-2 bg-card/50 border border-white/5 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setPopularType("movie")}
                aria-label={t("home.popularMovies") || "Show popular movies"}
                className={`px-4 py-2 rounded text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  popularType === "movie"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("common.movies")}
              </button>
              <button
                type="button"
                onClick={() => setPopularType("tv")}
                aria-label={t("home.popularSeries") || "Show popular series"}
                className={`px-4 py-2 rounded text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  popularType === "tv"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("common.tvShows")}
              </button>
            </div>
          </div>
          {popularType === "movie" && (
            <MediaCarousel
              title={t("home.popularMovies")}
              items={popularMovies?.results || []}
              loading={loadingPopularMovies}
              showMoreLink="/search?type=movie"
            />
          )}
          {popularType === "tv" && (
            <MediaCarousel
              title={t("home.popularSeries")}
              items={popularTV?.results || []}
              loading={!deferredEnabled || loadingPopularTV}
              showMoreLink="/search?type=tv"
            />
          )}
        </section>
      </div>
    </div>
  );
}
