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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const { watched, watchlist } = useUserLists();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
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
  const hasListActivity = watchlist.length > 0 || watched.length > 0;
  const dailyPick: Media | null =
    watchlistPreviewQuery.data?.[0] ||
    criticalDataQuery.data?.trendingWeek?.results?.[0] ||
    trendingDayQuery.data?.results?.[0] ||
    null;
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
        showMoreLink="/watchlist"
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
          <Link to="/watchlist">{t("home.startTracking", "Start Tracking")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/signup">{t("home.createFreeAccount", "Create Free Account")}</Link>
        </Button>
      </div>
    </section>
  ) : null;

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
  );

  const sharedDiscoveryRails = (
    <>
      <MediaSection
        title={t("home.topRatedMovies", "Top Rated Movies")}
        items={topRatedMoviesQuery.data?.results || []}
        loading={topRatedMoviesQuery.isLoading}
        showMoreLink="/movies"
        emptyMessage={t("home.topRatedMoviesEmpty", "Top rated movies will appear here soon.")}
      />

      <MediaSection
        title={t("home.popularTVShows", "Popular TV Shows")}
        items={popularTVQuery.data?.results || []}
        loading={popularTVQuery.isLoading}
        showMoreLink="/tv"
        emptyMessage={t("home.popularTVShowsEmpty", "Popular TV shows will appear here soon.")}
      />

      <MediaSection
        title={t("home.popularMovies", "Popular Movies")}
        items={popularMoviesQuery.data?.results || []}
        loading={popularMoviesQuery.isLoading}
        showMoreLink="/discover"
        emptyMessage={t("home.popularMoviesEmpty", "Popular movies will appear here soon.")}
      />

      <MediaSection
        title={t("home.criticallyAcclaimedTV", "Critically Acclaimed TV")}
        items={topRatedTVQuery.data?.results || []}
        loading={topRatedTVQuery.isLoading}
        showMoreLink="/tv"
        emptyMessage={t("home.criticallyAcclaimedTVEmpty", "TV shows will appear here soon.")}
      />
    </>
  );

  useEffect(() => {
    if (typeof window === "undefined" || authLoading || user) return;
    const hasSeenOnboarding = window.localStorage.getItem("cinetrekker_guest_onboarding_seen");
    if (!hasSeenOnboarding) {
      setOnboardingOpen(true);
    }
  }, [authLoading, user]);

  const dismissOnboarding = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cinetrekker_guest_onboarding_seen", "true");
    }
    setOnboardingOpen(false);
  };

  const freshDiscoverySection = (
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
        <div key={discoverTab} className="animate-fade-in">
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

      <main className="page-container space-y-5 pb-24 pt-6 sm:pt-7 md:space-y-8 md:pb-0 md:pt-8">
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
            <MotionRevealSection tone="standard" delayClassName="delay-100" accentOpacityClassName="opacity-25">
              <ContinueWatching />
            </MotionRevealSection>
            {watchlistSection ? (
              <MotionRevealSection tone="soft" delayClassName="delay-150" accentOpacityClassName="opacity-25">
                {watchlistSection}
              </MotionRevealSection>
            ) : null}
            {!shouldGateRecommendations && (
              <MotionRevealSection tone="bold" delayClassName="delay-200" accentOpacityClassName="opacity-28">
                {personalizedSection}
              </MotionRevealSection>
            )}
            <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-22">
              {sharedDiscoveryRails}
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-20">
              <RecentlyViewed />
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-18">
              <HomeStatsSnapshot watched={watched} watchlist={watchlist} />
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-16">
              {freshDiscoverySection}
            </MotionRevealSection>
          </>
        ) : (
          <>
            <MotionRevealSection tone="soft" delayClassName="delay-75" accentOpacityClassName="opacity-16">
              <GuestSyncBanner />
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-100" accentOpacityClassName="opacity-22">
              {freshDiscoverySection}
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-150" accentOpacityClassName="opacity-20">
              {sharedDiscoveryRails}
            </MotionRevealSection>
            <MotionRevealSection tone="bold" delayClassName="delay-200" accentOpacityClassName="opacity-30">
              <DailyPickSection
                pick={dailyPick}
                sourceLabel={t("home.dailyPickGuests", "Start with tonight's pick")}
              />
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-250" accentOpacityClassName="opacity-18">
              <RecentlyViewed />
            </MotionRevealSection>
            {watchlistSection ? (
              <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-22">
                {watchlistSection}
              </MotionRevealSection>
            ) : null}
            {!shouldGateRecommendations && (
              <MotionRevealSection tone="bold" delayClassName="delay-300" accentOpacityClassName="opacity-26">
                {personalizedSection}
              </MotionRevealSection>
            )}
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
      </main>

      <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
        <DialogContent className="max-w-2xl border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>
              {t("home.onboarding.title", "Welcome to CineTrekker")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t(
                "home.onboarding.description",
                "Here is the fast version so you know what the app does, what guest mode means, and how to keep your data safe.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                title: t("home.onboarding.step1", "1. What it does"),
                body: t("home.onboarding.step1Body", "Track titles, build a watchlist, and discover new picks with a locations-first hook."),
              },
              {
                title: t("home.onboarding.step2", "2. How saving works"),
                body: t("home.onboarding.step2Body", "If you continue as a guest, your data stays on this device only until you create an account."),
              },
              {
                title: t("home.onboarding.step3", "3. Choose your path"),
                body: t("home.onboarding.step3Body", "Create a free account to sync across devices or continue as a guest and explore first."),
              },
            ].map((step) => (
              <div key={step.title} className="rounded-2xl border border-border/60 bg-background/35 p-4">
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={dismissOnboarding}>
              {t("home.onboarding.continueGuest", "Continue as guest")}
            </Button>
            <Button asChild variant="outline">
              <Link to="/login" onClick={dismissOnboarding}>
                {t("nav.signIn", "Sign In")}
              </Link>
            </Button>
            <Button asChild className="btn-primary-glow">
              <Link to="/signup" onClick={dismissOnboarding}>
                {t("home.createFreeAccount", "Create Free Account")}
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
