import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { Media } from "@/types/media";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/HeroSection";
import { MediaCardSkeleton } from "@/components/MediaCard";
import { MediaSection } from "@/components/MediaSection";
import { MediaCarouselEnhanced } from "@/components/MediaCarouselEnhanced";
import { MediaGrid } from "@/components/MediaGrid";
import { ContinueWatching } from "@/components/ContinueWatching";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLists } from "@/contexts/UserListsContext";
import { useHomePageData } from "@/hooks/useHomePageData";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { HomeSectionState } from "@/components/home/HomeSectionState";
import { HomeStatsSnapshot } from "@/components/home/HomeStatsSnapshot";
import { HomeWatchlistSkeleton } from "@/components/home/HomeWatchlistSkeleton";
import { DailyPickSection } from "@/components/home/DailyPickSection";
import { MotionRevealSection } from "@/components/motion/MotionRevealSection";
import { PaginationDots, PaginationDotStatic } from "@/components/ui/pagination-dots";
import GuestSyncBanner from "@/components/GuestSyncBanner";
import {
  buildCanonicalUrl,
  toBreadcrumbJsonLd,
  toFaqJsonLd,
  toWebsiteSearchJsonLd,
} from "@/lib/seo";
import { OnboardingTooltip } from "@/components/OnboardingTooltip";
import { OnboardingChecklist } from "@/components/home/OnboardingChecklist";

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

function GridRailSkeleton() {
  return (
    <section className="ct-panel p-5 md:p-6 min-h-[360px]">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-md skeleton-shimmer" />
        </div>
        <div className="h-9 w-24 rounded-full skeleton-shimmer" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-44 rounded-2xl border border-border/60 bg-card/60 skeleton-shimmer" />
        ))}
      </div>
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

function DiscoveryGridRail({
  title,
  items,
  href,
}: {
  title: string;
  items: unknown[];
  href: string;
}) {
  return (
    <section className="ct-panel space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {title}
          </h2>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to={href}>See All</Link>
        </Button>
      </div>
      <MediaGrid items={items as never[]} columns="normal" gap="md" />
    </section>
  );
}

export default function Index() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { watched, watchlist } = useUserLists();
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
    topRatedMoviesQuery,
    topRatedTVQuery,
    popularMoviesQuery,
    popularTVQuery,
  } = useHomePageData({
    language,
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
  const watchlistDestination = user ? "/watchlist" : "/signup";
  const hasListActivity = watchlist.length > 0 || watched.length > 0;
  const dailyPick: Media | null = (() => {
    if (watchlistPreviewQuery.data?.[0]) {
      return watchlistPreviewQuery.data[0];
    }
    const weeklyResults = criticalDataQuery.data?.trendingWeek?.results || [];
    const dailyResults = trendingDayQuery.data?.results || [];
    
    // Shift index to index 3 or higher to ensure the title is distinct from the primary hero carousel
    if (weeklyResults.length > 3) return weeklyResults[3] as Media;
    if (dailyResults.length > 3) return dailyResults[3] as Media;
    if (weeklyResults.length > 1) return weeklyResults[1] as Media;
    if (dailyResults.length > 1) return dailyResults[1] as Media;
    return weeklyResults[0] || dailyResults[0] || null;
  })();
  const watchlistSection = hasListActivity ? (
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
        title={user ? t("nav.watchlist", "Watchlist") : t("home.localWatchlist", "Your Local Watchlist")}
        items={watchlistPreviewQuery.data || []}
        emptyMessage={t(
          "home.watchlistEmptyQuickAccess",
          "Save a few titles and they will show up here for quick access.",
        )}
        showMoreLink={watchlistDestination}
      />
    </HomeSectionState>
  ) : null;

  const guestStartSection = !user && !hasListActivity ? (
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
          <Link to="/discover">{t("home.startTracking", "Start Tracking")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/signup">{t("home.createFreeAccount", "Create Free Account")}</Link>
        </Button>
      </div>
    </section>
  ) : null;

  const moodChipsSection = (
    <section className="ct-panel p-5 md:p-6">
      <h2 className="text-lg font-bold tracking-tight text-foreground md:text-xl mb-1">
        {t("home.browseByMood", "How are you feeling tonight?")}
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        {t("home.browseByMoodSub", "Choose a mood to instantly explore curated tracking lists.")}
      </p>
      <div className="flex flex-wrap gap-2.5">
        {[
          { label: "😊 Feel Good", href: "/search?genre=35&sort=popularity.desc" },
          { label: "⚡ Adrenaline Rush", href: "/search?genre=28,12&sort=popularity.desc" },
          { label: "🧠 Mind-bending", href: "/search?genre=9648,878&sort=vote_average.desc" },
          { label: "🍿 Funny", href: "/search?genre=35&sort=popularity.desc" },
          { label: "🕵️ Dark & Gritty", href: "/search?genre=80,53&sort=popularity.desc" },
          { label: "👻 Chilling Horror", href: "/search?genre=27&sort=popularity.desc" },
        ].map((mood) => (
          <Button
            key={mood.label}
            asChild
            variant="outline"
            className="rounded-full bg-white/[0.02] border-white/10 hover:border-primary/45 hover:bg-primary/5 transition-all text-xs h-9 px-4"
          >
            <Link to={mood.href}>{mood.label}</Link>
          </Button>
        ))}
      </div>
    </section>
  );

  const personalizedSection = (
    <HomeSectionState
      title={t("home.personalizedRecommendations", "Personalized Recommendations")}
      loading={deferredEnabled && moreInGenreQuery.isLoading}
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
            <Link to={watchlistDestination}>
              {user
                ? t("home.buildWatchlist", "Build My Watchlist")
                : t("home.createFreeAccount", "Create Free Account")}
            </Link>
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
  );

  const sharedDiscoveryRails = (
    <>
      <HomeSectionState
        title={t("home.topRatedMovies", "Top Rated Movies")}
        loading={topRatedMoviesQuery.isLoading}
        error={topRatedMoviesQuery.error instanceof Error ? topRatedMoviesQuery.error : null}
        onRetry={() => { void topRatedMoviesQuery.refetch(); }}
        skeleton={<TrendingSectionSkeleton />}
      >
        <MediaSection
          title={t("home.topRatedMovies", "Top Rated Movies")}
          items={topRatedMoviesQuery.data?.results || []}
          showMoreLink="/movies"
          emptyMessage={t("home.topRatedMoviesEmpty", "Top rated movies will appear here soon.")}
        />
      </HomeSectionState>

      <HomeSectionState
        title={t("home.popularTVShows", "Popular TV Shows")}
        loading={popularTVQuery.isLoading}
        error={popularTVQuery.error instanceof Error ? popularTVQuery.error : null}
        onRetry={() => { void popularTVQuery.refetch(); }}
        skeleton={<GridRailSkeleton />}
      >
        <DiscoveryGridRail
          title={t("home.popularTVShows", "Popular TV Shows")}
          items={(popularTVQuery.data?.results || []).slice(0, 8)}
          href="/tv"
        />
      </HomeSectionState>

      <HomeSectionState
        title={t("home.popularMovies", "Popular Movies")}
        loading={popularMoviesQuery.isLoading}
        error={popularMoviesQuery.error instanceof Error ? popularMoviesQuery.error : null}
        onRetry={() => { void popularMoviesQuery.refetch(); }}
        skeleton={<TrendingSectionSkeleton />}
      >
        <MediaSection
          title={t("home.popularMovies", "Popular Movies")}
          items={popularMoviesQuery.data?.results || []}
          showMoreLink="/discover"
          emptyMessage={t("home.popularMoviesEmpty", "Popular movies will appear here soon.")}
        />
      </HomeSectionState>

      <HomeSectionState
        title={t("home.criticallyAcclaimedTV", "Critically Acclaimed TV")}
        loading={topRatedTVQuery.isLoading}
        error={topRatedTVQuery.error instanceof Error ? topRatedTVQuery.error : null}
        onRetry={() => { void topRatedTVQuery.refetch(); }}
        skeleton={<GridRailSkeleton />}
      >
        <DiscoveryGridRail
          title={t("home.criticallyAcclaimedTV", "Critically Acclaimed TV")}
          items={(topRatedTVQuery.data?.results || []).slice(0, 8)}
          href="/discover"
        />
      </HomeSectionState>
    </>
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

      <div className="page-container space-y-5 pb-8 pt-6 sm:pt-7 md:space-y-8 md:pb-0 md:pt-8">
        {!authLoading && !user && <OnboardingChecklist />}
        {authLoading ? (
          <AuthHomeSkeleton />
        ) : user ? (
          <>
            <MotionRevealSection tone="bold" delayClassName="delay-75" accentOpacityClassName="opacity-30">
              <DailyPickSection
                pick={dailyPick}
                sourceLabel={t("home.dailyPick", "Tonight's Pick")}
              />
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-75" accentOpacityClassName="opacity-15">
              {moodChipsSection}
            </MotionRevealSection>
            <MotionRevealSection tone="standard" delayClassName="delay-100" accentOpacityClassName="opacity-25">
              <ContinueWatching />
            </MotionRevealSection>
            {watchlistSection ? (
              <MotionRevealSection tone="soft" delayClassName="delay-150" accentOpacityClassName="opacity-25">
                {watchlistSection}
              </MotionRevealSection>
            ) : null}
            <MotionRevealSection tone="bold" delayClassName="delay-200" accentOpacityClassName="opacity-28">
              {personalizedSection}
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-22">
              {sharedDiscoveryRails}
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-20">
              <RecentlyViewed />
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-18">
              <HomeStatsSnapshot watched={watched} watchlist={watchlist} />
            </MotionRevealSection>
          </>
        ) : (
          <>
            <MotionRevealSection tone="soft" delayClassName="delay-75" accentOpacityClassName="opacity-16">
              <GuestSyncBanner />
            </MotionRevealSection>
            <MotionRevealSection tone="bold" delayClassName="delay-100" accentOpacityClassName="opacity-30">
              <DailyPickSection
                pick={dailyPick}
                sourceLabel={t("home.dailyPickGuests", "Start with tonight's pick")}
              />
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-100" accentOpacityClassName="opacity-15">
              {moodChipsSection}
            </MotionRevealSection>
            {watchlistSection ? (
              <MotionRevealSection tone="soft" delayClassName="delay-150" accentOpacityClassName="opacity-22">
                {watchlistSection}
              </MotionRevealSection>
            ) : null}
            <MotionRevealSection tone="bold" delayClassName="delay-200" accentOpacityClassName="opacity-26">
              {personalizedSection}
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-20">
              {sharedDiscoveryRails}
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-18">
              <RecentlyViewed />
            </MotionRevealSection>
            {guestStartSection ? (
              <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-14">
                {guestStartSection}
              </MotionRevealSection>
            ) : null}
            {hasListActivity ? (
              <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-16">
                <HomeStatsSnapshot
                  watched={watched}
                  watchlist={watchlist}
                  ctaHref="/signup"
                  ctaLabel={t("home.syncToAccount", "Sync with Free Account")}
                />
              </MotionRevealSection>
            ) : null}
          </>
        )}

        <section className="border-t border-border pt-8 md:pt-10">
          <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title mb-1">{t("home.freshDiscovery", "Fresh Discovery")}</h2>
              <p className="text-sm text-muted-foreground">
                {t(
                  "home.globalDiscoveryHint",
                  "Trending titles and fresh releases live here so the rest of the homepage can stay focused on your queue.",
                )}
              </p>
            </div>
            <div className="hide-scrollbar -mx-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
              <div className="ct-toggle-group w-max sm:w-auto">
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
                    className={`ct-toggle-button whitespace-nowrap min-h-[44px] ${
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
          </div>

          <HomeSectionState
            title={t("home.freshDiscovery", "Fresh Discovery")}
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
            <div key={discoverTab} className="animate-fade-in min-h-[320px] md:min-h-[400px]">
              {discoverTab === "trending-day" ? (
                <MediaCarouselEnhanced
                  title={t("home.trendingToday", "Trending Today")}
                  items={trendingDayQuery.data?.results || []}
                  showMoreLink="/discover"
                  showMoreLabel={t("home.seeAllTrending", "See All Trending")}
                />
              ) : null}
              {discoverTab === "trending-week" ? (
                <MediaCarouselEnhanced
                  title={t("home.trendingWeek", "Trending This Week")}
                  items={trendingWeek?.results || []}
                  showMoreLink="/discover"
                  showMoreLabel={t("home.seeAllTrending", "See All Trending")}
                />
              ) : null}
              {discoverTab === "new-releases" ? (
                <MediaCarouselEnhanced
                  title={t("home.newReleases", "New Releases")}
                  items={newReleases?.results || []}
                  showMoreLink="/discover"
                  showMoreLabel={t("home.seeAllNewMovieReleases", "See All New Movie Releases")}
                />
              ) : null}
            </div>
          </HomeSectionState>
        </section>
      </div>

      <OnboardingTooltip />
    </div>
  );
}
