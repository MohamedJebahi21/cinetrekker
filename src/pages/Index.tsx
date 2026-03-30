import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MediaSection } from "@/components/MediaSection";
import { MediaCarouselEnhanced } from "@/components/MediaCarouselEnhanced";
import { MediaCardSkeleton } from "@/components/MediaCard";
import { HeroSection } from "@/components/HeroSection";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLists } from "@/contexts/UserListsContext";
import { Button } from "@/components/ui/button";
import { useHomePageData } from "@/hooks/useHomePageData";
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
    hasDeferredErrors,
  } = useHomePageData({
    language,
    user,
    watched,
    watchlist,
  });

  const newReleases = criticalDataQuery.data?.newReleases;
  const trendingWeek = criticalDataQuery.data?.trendingWeek;
  const loadingWeek = criticalDataQuery.isLoading;
  const loadingCritical = criticalDataQuery.isLoading;
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
      {/* High-Conversion Hero Section */}
      <HeroSection />

      {/* AI Movie Scout removed per request */}

      <div className="page-container space-y-4 pb-16 md:pb-0">
        {criticalDataQuery.error && (
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


        {/* New layout: Based on Recent Activity on top, below it a 2-column row: Did You Watch (left), Recently Added Movies (right) */}
        <div className="flex flex-col gap-8 mb-12">
          {/* Top: Based on Your Recent Activity (or placeholder) */}
          <div>
            {shouldGateRecommendations ? (
              <section className="ct-panel flex min-h-[180px] flex-col items-center justify-center p-4 md:p-6">
                <h2 className="text-lg font-bold text-foreground mb-2 text-center">
                  Personalized picks start after your first saves
                </h2>
                <p className="text-xs text-muted-foreground mb-3 text-center">
                  Sign up to get recommendations based on what you've actually watched.
                </p>
                <Button asChild className="btn-primary-glow">
                  <Link to={user ? "/watchlist" : "/signup"}>
                    {user ? "Build Your Watchlist" : "Create Free Account"}
                  </Link>
                </Button>
              </section>
            ) : (
              deferredEnabled && (
                <Suspense fallback={null}>
                  <BecauseYouLiked />
                  {/* More in this genre */}
                  {lastGenreId && (
                    <MediaSection
                      title={t("home.moreInGenre", { genre: lastGenreName || "Genre" })}
                      items={filteredGenreItems}
                      loading={moreInGenreQuery.isLoading}
                    />
                  )}
                  {/* Trending in your country */}
                  {/* Trending in Your Country: show only if enough items, else hide */}
                  {userCountry && filteredCountryItems.length >= 6 && (
                    <MediaSection
                      title={"Trending in Your Country"}
                      items={filteredCountryItems}
                      loading={trendingCountryQuery.isLoading}
                    />
                  )}
                </Suspense>
              )
            )}
          </div>
          {/* Full-width: Did You Watch? */}
          <div className="mb-12">
            {deferredEnabled && (
              <Suspense fallback={null}>
                <WatchedShowsNewEpisodes />
              </Suspense>
            )}
          </div>
          {/* Full-width: Recently Added Movies */}
          <div className="mb-12">
            {deferredEnabled && (
              <Suspense fallback={null}>
                <RecentlyAddedMovies />
              </Suspense>
            )}
          </div>
        </div>

        {/* New Episodes Section removed per UI cleanup */}

        {/* Discover section with top border and spacing */}
        <section className="border-t border-border mt-12 pt-12 mb-16">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title mb-1">Discover</h2>
              <p className="text-sm text-muted-foreground">
                Fresh picks from TMDB, organized for quick browsing.
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
          <div
            key={discoverTab}
            className="ct-panel animate-fade-in p-4 md:p-6"
          >
            {discoverTab === "trending-day" &&
              (!deferredEnabled || trendingDayQuery.isLoading ? (
                <TrendingSectionSkeleton />
              ) : (
                <MediaCarouselEnhanced
                  title="Trending Today"
                  items={trendingDayQuery.data?.results || []}
                  showMoreLink="/search?sort=popularity.desc"
                />
              ))}
            {discoverTab === "trending-week" &&
              (loadingWeek ? (
                <TrendingSectionSkeleton />
              ) : (
                <MediaCarouselEnhanced
                  title="Trending This Week"
                  items={trendingWeek?.results || []}
                  showMoreLink="/search?sort=popularity.desc"
                />
              ))}
            {discoverTab === "new-releases" &&
              (loadingCritical ? (
                <TrendingSectionSkeleton />
              ) : (
                <MediaCarouselEnhanced
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
      </div>
    </div>
  );
}
