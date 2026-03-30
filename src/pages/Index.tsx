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
    <section className="ct-panel p-4 md:p-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <MediaCardSkeleton
            key={index}
            delay={index * 70}
            className="border-white/5 bg-card/40"
          />
        ))}
      </div>
    </section>
  );
}

export default function Index() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { watched, watchlist } = useUserLists();
  const language = i18n.language;
  const {
    shouldGateRecommendations,
    discoverTab,
    setDiscoverTab,
    deferredEnabled,
    lastGenreId,
    lastGenreName,
    userCountry,
    filteredGenreItems,
    filteredCountryItems,
    moreInGenreQuery,
    trendingCountryQuery,
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
    moreInGenreQuery.isLoading || trendingCountryQuery.isLoading,
  );

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

  const personalizedHasError = Boolean(
    moreInGenreQuery.error || trendingCountryQuery.error,
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

      <div className="page-container space-y-8 pb-16 pt-8 md:pb-0">
        {user ? (
          <>
            <ContinueWatching />

            <HomeSectionState
              title="Watchlist"
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
                title="Watchlist"
                items={watchlistPreviewQuery.data || []}
                emptyMessage="Save a few titles and they will show up here for quick access."
                showMoreLink="/watchlist"
              />
            </HomeSectionState>

            <HomeSectionState
              title="Personalized Recommendations"
              loading={
                deferredEnabled &&
                (moreInGenreQuery.isLoading || trendingCountryQuery.isLoading)
              }
              timedOut={personalizedTimedOut}
              error={personalizedHasError ? new Error("recommendations") : null}
              onRetry={() => {
                void moreInGenreQuery.refetch();
                void trendingCountryQuery.refetch();
              }}
              skeleton={<TrendingSectionSkeleton />}
            >
              {shouldGateRecommendations ? (
                <section className="ct-panel flex min-h-[180px] flex-col items-center justify-center p-6 text-center">
                  <h2 className="text-xl font-semibold text-foreground">
                    Personalized picks start after your first saves
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Add a few movies or series to your watchlist so CineTrekker
                    can put your next best watch ahead of the global feed.
                  </p>
                  <Button asChild className="btn-primary-glow mt-4">
                    <Link to="/watchlist">Build My Watchlist</Link>
                  </Button>
                </section>
              ) : (
                <div className="space-y-8">
                  <Suspense fallback={<TrendingSectionSkeleton />}>
                    <BecauseYouLiked />
                  </Suspense>

                  {lastGenreId ? (
                    <MediaSection
                      title={`More in ${lastGenreName || "this genre"}`}
                      items={filteredGenreItems}
                      loading={moreInGenreQuery.isLoading}
                      emptyMessage="We need a bit more watch history before this row fills in."
                    />
                  ) : null}

                  {userCountry && filteredCountryItems.length > 0 ? (
                    <MediaSection
                      title="Trending in Your Country"
                      items={filteredCountryItems}
                      loading={trendingCountryQuery.isLoading}
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
              Make every visit personal
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Create a free account to keep your watchlist, progress, ratings,
              and recommendations synced across devices.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="btn-primary-glow">
                <Link to="/signup">Create Free Account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/search">Explore Trending Titles</Link>
              </Button>
            </div>
          </section>
        )}

        <section className="border-t border-border pt-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title mb-1">Trending Now</h2>
              <p className="text-sm text-muted-foreground">
                Global discovery stays here so your personal library comes first.
              </p>
            </div>
            <div className="ct-toggle-group">
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
            title="Trending Now"
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
                  title="Trending Today"
                  items={trendingDayQuery.data?.results || []}
                  showMoreLink="/search?sort=popularity.desc"
                />
              ) : null}
              {discoverTab === "trending-week" ? (
                <MediaCarouselEnhanced
                  title="Trending This Week"
                  items={trendingWeek?.results || []}
                  showMoreLink="/search?sort=popularity.desc"
                />
              ) : null}
              {discoverTab === "new-releases" ? (
                <MediaCarouselEnhanced
                  title="New Releases"
                  items={newReleases?.results || []}
                  showMoreLink="/search?sort=primary_release_date.desc&type=movie"
                />
              ) : null}
            </div>
          </HomeSectionState>

          <p className="mt-3 text-xs text-muted-foreground">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </section>
      </div>
    </div>
  );
}
