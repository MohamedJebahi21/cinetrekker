import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/HeroSection";
import { MediaCardSkeleton } from "@/components/MediaCard";
import { MediaSection } from "@/components/MediaSection";
import { MediaCarouselEnhanced } from "@/components/MediaCarouselEnhanced";
import { ContinueWatching } from "@/components/ContinueWatching";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLists } from "@/contexts/UserListsContext";
import { useHomePageData } from "@/hooks/useHomePageData";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { HomeSectionState } from "@/components/home/HomeSectionState";
import { HomeStatsSnapshot } from "@/components/home/HomeStatsSnapshot";
import { HomeWatchlistSkeleton } from "@/components/home/HomeWatchlistSkeleton";
import { PaginationDots, PaginationDotStatic } from "@/components/ui/pagination-dots";
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

function TrendingSectionSkeleton() {
  return (
    <section className="ct-panel min-h-[420px] p-4 md:min-h-[520px] md:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-md skeleton-shimmer" />
          <div className="h-4 w-72 rounded-md skeleton-shimmer" />
        </div>
        <div className="h-9 w-24 rounded-full skeleton-shimmer" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="min-w-[calc(50vw-1rem)] sm:min-w-[180px] md:min-w-[200px] lg:min-w-[220px] xl:min-w-[240px]"
          >
            <MediaCardSkeleton
              delay={index * 70}
              className="border-white/5 bg-card/40"
            />
          </div>
        ))}
      </div>
      <PaginationDots>
        {Array.from({ length: 4 }).map((_, index) => (
          <PaginationDotStatic key={index} active={index === 0} aria-hidden="true" />
        ))}
      </PaginationDots>
    </section>
  );
}

function AuthHomeSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8">
      <section className="ct-panel min-h-[460px] p-5 md:min-h-[520px] md:p-6">
        <div className="mb-5 space-y-2">
          <div className="h-7 w-56 rounded-md skeleton-shimmer" />
          <div className="h-4 w-80 rounded-md skeleton-shimmer" />
        </div>
        <div className="hide-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-[440px] w-[min(82vw,360px)] shrink-0 rounded-3xl border border-border/60 bg-card/60 skeleton-shimmer sm:h-[420px] sm:w-[320px] md:w-[360px]"
            />
          ))}
        </div>
      </section>

      <TrendingSectionSkeleton />

      <section className="ct-panel min-h-[220px] p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-md skeleton-shimmer" />
            <div className="h-4 w-72 rounded-md skeleton-shimmer" />
          </div>
          <div className="h-9 w-28 rounded-full skeleton-shimmer" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 rounded-2xl border border-border/60 bg-card/60 skeleton-shimmer"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function Index() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { watched, watchlist, loading: userListsLoading } = useUserLists();
  const language = i18n.language;
  const {
    shouldGateRecommendations,
    discoverTab,
    setDiscoverTab,
    deferredEnabled,
    lastGenreId,
    lastGenreName,
    filteredGenreItems,
    moreInGenreQuery,
    criticalDataQuery,
    trendingDayQuery,
    watchlistPreviewQuery,
  } = useHomePageData({
    language,
    user,
    watched,
    watchlist,
  });

  const newReleases = criticalDataQuery.data?.newReleases;
  const trendingWeek = criticalDataQuery.data?.trendingWeek;
  const watchlistTimedOut = useLoadingTimeout(watchlistPreviewQuery.isLoading);
  const discoveryTimedOut = useLoadingTimeout(
    criticalDataQuery.isLoading || trendingDayQuery.isLoading,
  );
  const personalizedTimedOut = useLoadingTimeout(
    moreInGenreQuery.isLoading,
  );

  const faqItems = [
    {
      question: t("home.faq.q1", "What is CineTrekker movie tracker used for?"),
      answer:
        t(
          "home.faq.a1",
          "CineTrekker helps you track movies and TV shows, keep a personal watchlist, mark progress, and discover trending titles without losing context across devices.",
        ),
    },
    {
      question: t("home.faq.q2", "Can I follow releases and episode updates?"),
      answer:
        t(
          "home.faq.a2",
          "Yes. The app includes follow and notification tools so you can monitor returning series, new episodes, and titles you want to revisit later.",
        ),
    },
    {
      question: t("home.faq.q3", "Does CineTrekker work well on mobile?"),
      answer:
        t(
          "home.faq.a3",
          "Yes. The interface is designed mobile-first with responsive cards, touch-friendly controls, skeleton loading states, and fast lazy-loaded media.",
        ),
    },
  ];

  const personalizedHasError = Boolean(
    moreInGenreQuery.error,
  );

  return (
    <div className="ct-page-shell min-h-screen">
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

      <HeroSection />

      <main className="page-container space-y-6 pb-24 pt-8 md:space-y-8 md:pb-0">
        {authLoading ? (
          <AuthHomeSkeleton />
        ) : user ? (
          <>
            <ContinueWatching />

            <HomeSectionState
              title={t("nav.watchlist", "Watchlist")}
              loading={watchlistPreviewQuery.isLoading}
              timedOut={watchlistTimedOut}
              error={
                watchlistPreviewQuery.error instanceof Error
                  ? watchlistPreviewQuery.error
                  : null
              }
              onRetry={() => {
                void watchlistPreviewQuery.refetch();
              }}
              skeleton={<HomeWatchlistSkeleton />}
            >
              <MediaSection
                title={t("nav.watchlist", "Watchlist")}
                items={watchlistPreviewQuery.data || []}
                emptyMessage={t(
                  "home.watchlistEmptyQuickAccess",
                  "Save a few titles and they will show up here for quick access.",
                )}
                showMoreLink="/watchlist"
              />
            </HomeSectionState>

            <HomeSectionState
              title={t("home.personalizedRecommendations", "Personalized Recommendations")}
              loading={
                deferredEnabled &&
                moreInGenreQuery.isLoading
              }
              timedOut={personalizedTimedOut}
              error={personalizedHasError ? new Error("recommendations") : null}
              onRetry={() => {
                void moreInGenreQuery.refetch();
              }}
              skeleton={<TrendingSectionSkeleton />}
            >
              {shouldGateRecommendations ? (
                <section className="ct-panel flex min-h-[180px] flex-col items-center justify-center p-6 text-center">
                  <h2 className="text-xl font-semibold text-foreground">
                    {t("home.personalizedGateTitle", "Personalized picks start after your first saves")}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    {t(
                      "home.personalizedGateDesc",
                      "Add a few movies or series to your watchlist so CineTrekker can put your next best watch ahead of the global feed.",
                    )}
                  </p>
                  <Button asChild className="btn-primary-glow mt-4">
                    <Link to="/watchlist">{t("home.buildWatchlist", "Build My Watchlist")}</Link>
                  </Button>
                </section>
              ) : (
                <div className="space-y-6 md:space-y-8">
                  <Suspense fallback={<TrendingSectionSkeleton />}>
                    <BecauseYouLiked />
                  </Suspense>

                  {lastGenreId ? (
                    <MediaSection
                      title={t("home.moreInGenre", {
                        genre: lastGenreName || t("home.thisGenre", "this genre"),
                        defaultValue: `More in ${lastGenreName || "this genre"}`,
                      })}
                      items={filteredGenreItems}
                      loading={moreInGenreQuery.isLoading}
                      emptyMessage={t(
                        "home.moreInGenreEmpty",
                        "We need a bit more watch history before this row fills in.",
                      )}
                    />
                  ) : null}
                </div>
              )}
            </HomeSectionState>

            <HomeStatsSnapshot watched={watched} watchlist={watchlist} />
          </>
        ) : (
          <section className="ct-panel flex min-h-[180px] flex-col items-center justify-center p-6 text-center">
            <h2 className="text-xl font-semibold text-foreground">
              {t("home.makeEveryVisitPersonal", "Make every visit personal")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {t(
                "home.createAccountSyncDesc",
                "Create a free account to keep your watchlist, progress, ratings, and recommendations synced across devices.",
              )}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="btn-primary-glow">
                <Link to="/signup">{t("home.createFreeAccount", "Create Free Account")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/search">{t("home.exploreTrendingTitles", "Explore Trending Titles")}</Link>
              </Button>
            </div>
          </section>
        )}

        <section className="border-t border-border pt-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title mb-1">{t("search.trendingNow", "Trending Now")}</h2>
              <p className="text-sm text-muted-foreground">
                {t(
                  "home.globalDiscoveryHint",
                  "Global discovery stays here so your personal library comes first.",
                )}
              </p>
            </div>
            <div className="ct-toggle-group">
              {[
                { key: "trending-day", label: t("home.trendingToday", "Trending Today") },
                { key: "trending-week", label: t("home.trendingWeek", "Trending This Week") },
                { key: "new-releases", label: t("home.newReleases", "New Releases") },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() =>
                    setDiscoverTab(
                      tab.key as "trending-day" | "trending-week" | "new-releases",
                    )
                  }
                  className={`ct-toggle-button min-h-[44px] ${
                    discoverTab === tab.key
                      ? "ct-toggle-button-active"
                      : "hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <HomeSectionState
            title={t("search.trendingNow", "Trending Now")}
            loading={!deferredEnabled || criticalDataQuery.isLoading || trendingDayQuery.isLoading}
            timedOut={discoveryTimedOut}
            error={
              criticalDataQuery.error instanceof Error
                ? criticalDataQuery.error
                : trendingDayQuery.error instanceof Error
                  ? trendingDayQuery.error
                  : null
            }
            onRetry={() => {
              void criticalDataQuery.refetch();
              void trendingDayQuery.refetch();
            }}
            skeleton={<TrendingSectionSkeleton />}
          >
            <div key={discoverTab} className="animate-fade-in">
              {discoverTab === "trending-day" ? (
                <MediaCarouselEnhanced
                  title={t("home.trendingToday", "Trending Today")}
                  items={trendingDayQuery.data?.results || []}
                  showMoreLink="/movies"
                  showMoreLabel={t("home.seeAllTrendingMovies", "See All Trending Movies")}
                />
              ) : null}
              {discoverTab === "trending-week" ? (
                <MediaCarouselEnhanced
                  title={t("home.trendingWeek", "Trending This Week")}
                  items={trendingWeek?.results || []}
                  showMoreLink="/tv"
                  showMoreLabel={t("home.seeAllTrendingTv", "See All Trending TV")}
                />
              ) : null}
              {discoverTab === "new-releases" ? (
                <MediaCarouselEnhanced
                  title={t("home.newReleases", "New Releases")}
                  items={newReleases?.results || []}
                  showMoreLink="/movies"
                  showMoreLabel={t("home.seeAllNewMovieReleases", "See All New Movie Releases")}
                />
              ) : null}
            </div>
          </HomeSectionState>

          <p className="mt-3 text-xs text-muted-foreground">
            {t(
              "footer.attribution",
              "This product uses the TMDB API but is not endorsed or certified by TMDB. All movie and TV show data, including images and metadata, is provided by The Movie Database (TMDB).",
            )}
          </p>
        </section>
      </main>
    </div>
  );
}
