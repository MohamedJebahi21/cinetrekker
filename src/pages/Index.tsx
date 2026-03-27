import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  getTrending,
  getNowPlayingMovies,
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
import { useAuth } from "@/contexts/AuthContext";
import { useUserLists } from "@/contexts/UserListsContext";
import { useLastViewed } from "@/hooks/useLastViewed";
import { FAQSection } from "@/components/FAQSection";
import { Button } from "@/components/ui/button";
import {
  buildCanonicalUrl,
  toBreadcrumbJsonLd,
  toFaqJsonLd,
  toWebsiteSearchJsonLd,
} from "@/lib/seo";

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
  const { user } = useAuth();
  const { watched, watchlist } = useUserLists();
  const { lastViewed } = useLastViewed();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const language = i18n.language;
  const shouldGateRecommendations =
    !user || (watched.length === 0 && watchlist.length === 0 && !lastViewed);

  // State for tab selections
  const [discoverTab, setDiscoverTab] = useState<
    "trending-day" | "trending-week" | "new-releases"
  >("trending-day");
  const [topRatedType, setTopRatedType] = useState<"movie" | "tv">("movie");

  const [deferredEnabled, setDeferredEnabled] = useState(false);

  const {
    data: criticalData,
    isLoading: loadingCritical,
    error: criticalError,
  } = useQuery({
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

  const newReleases = criticalData?.newReleases;
  const trendingWeek = criticalData?.trendingWeek;
  const loadingWeek = loadingCritical;
  const faqItems = [
    {
      question: "What is CineTrekker movie tracker used for?",
      answer:
        "CineTrekker helps you track movies and TV shows, keep a personal watchlist, mark progress, and discover trending titles without losing context across devices.",
    },
    {
      question: "Can I follow releases and episode updates?",
      answer:
        "Yes. The app includes follow and notification tools so you can monitor returning series, new episodes, and titles you want to revisit later.",
    },
    {
      question: "Does CineTrekker work well on mobile?",
      answer:
        "Yes. The interface is designed mobile-first with responsive cards, touch-friendly controls, skeleton loading states, and fast lazy-loaded media.",
    },
  ];

  const hasDeferredErrors = Boolean(
    topRatedMoviesError ||
    topRatedTVError ||
    trendingDayError,
  );

  return (
    <div className="min-h-screen">
      <SEO
        title="CineTrekker Movie Tracker | Track Movies, TV Shows, and Watchlists"
        description="CineTrekker is a movie tracker for finding trending movies, managing your watchlist, following new releases, and organizing what to watch next."
        canonical={buildCanonicalUrl("/")}
        keywords="movie tracker, track movies, tv show tracker, watchlist app, discover trending movies, personalized recommendations"
        jsonLd={[
          toWebsiteSearchJsonLd(),
          toBreadcrumbJsonLd([{ name: "Home", path: "/" }]),
          toFaqJsonLd(faqItems),
        ]}
      />
      {/* High-Conversion Hero Section */}
      <HeroSection />

      {/* AI Movie Scout removed per request */}

      <div className="page-container space-y-8 pb-24 md:pb-0">
        {criticalError && (
          <div className="rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
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

        {/* Phase 3: "Because You Liked" personalized row */}
        {deferredEnabled && (
          <Suspense fallback={null}>
            <ContinueWatching />
          </Suspense>
        )}

        {shouldGateRecommendations ? (
          <section className="rounded-3xl border border-border/40 bg-card/70 p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                  Personalized picks start after your first saves
                </h2>
                <p className="text-sm leading-7 text-muted-foreground md:text-base">
                  Sign up to get recommendations based on what you've actually watched.
                </p>
              </div>
              <Button asChild className="btn-primary-glow">
                <Link to={user ? "/watchlist" : "/signup"}>
                  {user ? "Build Your Watchlist" : "Create Free Account"}
                </Link>
              </Button>
            </div>
          </section>
        ) : (
          deferredEnabled && (
            <Suspense fallback={null}>
              <BecauseYouLiked />
            </Suspense>
          )
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

        <section>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title mb-1">Discover</h2>
              <p className="text-sm text-muted-foreground">
                Fresh picks from TMDB, organized for quick browsing.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 rounded-lg border border-white/5 bg-card/50 p-1">
              {[
                { key: "trending-day", label: "Trending Today" },
                { key: "trending-week", label: "Trending This Week" },
                { key: "new-releases", label: "New Releases" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() =>
                    setDiscoverTab(
                      tab.key as "trending-day" | "trending-week" | "new-releases",
                    )
                  }
                  className={`min-h-[44px] rounded px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    discoverTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div
            key={discoverTab}
            className="animate-fade-in rounded-3xl border border-border/40 bg-card/50 p-4 md:p-6"
          >
            {discoverTab === "trending-day" &&
              (!deferredEnabled || loadingDay ? (
                <TrendingSectionSkeleton />
              ) : (
                <MediaCarousel
                  title="Trending Today"
                  items={trendingDay?.results || []}
                  showMoreLink="/search?sort=popularity.desc"
                />
              ))}
            {discoverTab === "trending-week" &&
              (loadingWeek ? (
                <TrendingSectionSkeleton />
              ) : (
                <MediaCarousel
                  title="Trending This Week"
                  items={trendingWeek?.results || []}
                  showMoreLink="/search?sort=popularity.desc"
                />
              ))}
            {discoverTab === "new-releases" &&
              (loadingCritical ? (
                <TrendingSectionSkeleton />
              ) : (
                <MediaCarousel
                  title="New Releases"
                  items={newReleases?.results || []}
                  showMoreLink="/search?sort=primary_release_date.desc&type=movie"
                />
              ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </section>

        {/* Top Rated - Movies/Series Toggle */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <h2 className="section-title mb-0">
              {t("home.topRated") || "Top Rated"}
            </h2>
            <div className="flex gap-2 rounded-lg border border-white/5 bg-card/50 p-1">
              <button
                type="button"
                onClick={() => setTopRatedType("movie")}
                className={`min-h-[44px] rounded px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
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
                className={`min-h-[44px] rounded px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
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

        <FAQSection
          title="Movie tracker FAQs"
          intro="These quick answers are structured for search engines, AI assistants, and anyone deciding whether CineTrekker matches their movie and TV workflow."
          items={faqItems}
        />
      </div>
    </div>
  );
}
