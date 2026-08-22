import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { Media } from "@/types/media";
import { Bookmark, CheckCircle2, Flame, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/HeroSection";
import { MediaCardSkeleton } from "@/components/MediaCard";
import { MediaSection } from "@/components/MediaSection";
import { MediaCarouselEnhanced } from "@/components/MediaCarouselEnhanced";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLists } from "@/contexts/UserListsContext";
import { useHomePageData } from "@/hooks/useHomePageData";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { HomeSectionState } from "@/components/home/HomeSectionState";
import { HomeStatsSnapshot } from "@/components/home/HomeStatsSnapshot";
import { HomeWatchlistSkeleton } from "@/components/home/HomeWatchlistSkeleton";
import { SuggestedPeopleRail } from "@/components/home/SuggestedPeopleRail";
import { UpNextCommandCenter } from "@/components/home/UpNextCommandCenter";
import { ContinueWatching } from "@/components/ContinueWatching";
import { ActivationJourney } from "@/components/home/ActivationJourney";
import { CommunityActivityFeed } from "@/components/home/CommunityActivityFeed";
import { DailyCheckInCard } from "@/components/home/DailyCheckInCard";
import { CineQuestHub } from "@/components/quests/CineQuestHub";
import { MotionRevealSection } from "@/components/motion/MotionRevealSection";
import { PaginationDots, PaginationDotStatic } from "@/components/ui/pagination-dots";
import GuestSyncBanner from "@/components/GuestSyncBanner";
import { trackProductEvent } from "@/lib/analytics";
import {
  buildCanonicalUrl,
  toBreadcrumbJsonLd,
  toFaqJsonLd,
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
    trendingDayQuery,
    trendingWeekQuery,
    newReleasesQuery,
    activeDiscoveryQuery,
    watchlistPreviewQuery,
  } = useHomePageData({
    language,
    watched,
    watchlist,
  });

  const watchlistTimedOut = useLoadingTimeout(watchlistPreviewQuery.isLoading, 20_000);
  const discoveryTimedOut = useLoadingTimeout(activeDiscoveryQuery.isLoading);
  const personalizedTimedOut = useLoadingTimeout(
    moreInGenreQuery.isLoading,
  );
  const hasLibraryActivity = watched.length > 0 || watchlist.length > 0;

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

  const guestJourneySection = !user && !hasListActivity ? (
    <section
      className="rounded-2xl border border-border bg-card p-5 md:p-7"
      aria-labelledby="guest-journey-title"
    >
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/85">
            {t("home.guestJourneyEyebrow", "Your movie and TV tracker")}
          </p>
          <h2 id="guest-journey-title" className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {t("home.guestJourneyTitle", "Keep every great watch in one place.")}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
            {t(
              "home.guestJourneyDescription",
                              "Discover what is worth watching, save it for later, and create a free account when you want your progress and watchlist to follow you everywhere.",

            )}
          </p>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <Button asChild className="btn-primary-glow min-h-11 rounded-xl">
              <Link to="/discover">{t("home.guestJourneyExplore", "Explore what is trending")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-11 rounded-xl bg-background/35"
              onClick={() => trackProductEvent("signup_intent", { entry_surface: "home" })}
            >
              <Link to="/signup">{t("home.createFreeAccount", "Create Free Account")}</Link>
            </Button>
          </div>
        </div>

        <ol className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1" aria-label={t("home.guestJourneyStepsLabel", "How CineTrekker works")}>
          {[
            {
              step: "01",
              title: t("home.guestJourneyStep1Title", "Discover your next favorite"),
              body: t("home.guestJourneyStep1Body", "Start with weekly standouts, trending titles, and new releases."),
            },
            {
              step: "02",
              title: t("home.guestJourneyStep2Title", "Build a watchlist with intent"),
              body: t("home.guestJourneyStep2Body", "Keep a simple queue of films and series you genuinely want to see."),
            },
            {
              step: "03",
              title: t("home.guestJourneyStep3Title", "Remember every watch"),
              body: t("home.guestJourneyStep3Body", "A free account keeps your watchlist and progress in sync across devices."),
            },
          ].map((item) => (
            <li key={item.step} className="border-l border-border pl-3 first:border-primary">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
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

  const discoveryHubSection = (
    <section className="border-y border-border py-6 md:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
            {t("home.discoveryHubLabel", "Discovery Hub")}
          </p>
          <h2 className="section-title mb-1">
            {t("home.discoveryHubTitle", "Find your next favorite")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "home.discoveryHubDesc",
              "Search, save, and track movies and series in one focused place — from your first idea to the moment you press play.",
            )}
          </p>

        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px] lg:grid-cols-1 xl:min-w-[360px] xl:grid-cols-2">
          {[
            {
              href: "/search",
              label: t("nav.search", "Search"),
              desc: t("home.discoveryHubSearchDesc", "Find a movie, series, or person without the noise."),
              icon: Search,
            },
            {
              href: "/trending",
              label: t("nav.trending", "Trending"),
              desc: t("home.discoveryHubTrendingDesc", "See the movies and series people are talking about right now."),
              icon: Flame,
            },
            {
              href: "/watchlist",
              label: t("nav.watchlist", "Watchlist"),
              desc: t("home.discoveryHubWatchlistDesc", "Keep your next great watches ready when you need them."),
              icon: Bookmark,
            },
            {
              href: user ? "/recommendations" : "/signup",
              label: user
                ? t("nav.recommendations", "Recommendations")
                : t("nav.signUp", "Get Started"),
              desc: user
                ? t("home.discoveryHubRecsDesc", "Open your taste-matched picks.")
                : t("home.discoveryHubSignupDesc", "Create a free account to keep every save and watch in sync."),
              icon: Sparkles,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="group rounded-xl border border-transparent p-3 transition-colors duration-150 hover:bg-muted"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );

  const freshDiscoverySection = (
    <section className="border-t border-border pt-8 md:pt-10">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="section-title mb-1">{t("home.freshDiscovery", "Fresh Discovery")}</h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "home.globalDiscoveryHint",
              "Browse today’s breakout titles, this week’s favorites, and fresh releases — then save the ones you want to watch.",
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
        loading={!deferredEnabled || activeDiscoveryQuery.isLoading}
        timedOut={discoveryTimedOut}
        error={
          activeDiscoveryQuery.error instanceof Error
            ? activeDiscoveryQuery.error
            : null
        }
        onRetry={() => {
          void activeDiscoveryQuery.refetch();
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
              items={trendingWeekQuery.data?.results || []}
              showMoreLink="/discover"
              showMoreLabel={t("home.seeAllTrending", "See All Trending")}
            />
          ) : null}
          {discoverTab === "new-releases" ? (
            <MediaCarouselEnhanced
              title={t("home.newReleases", "New Releases")}
              items={newReleasesQuery.data?.results || []}
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
        title="Movie & TV Show Tracker — Watchlist and Progress | CineTrekker"
        description="Track movies and TV shows, build a watchlist you will actually use, log your progress, and discover what to watch next with CineTrekker."
        canonical={buildCanonicalUrl("/")}
        keywords="movie tracker, TV show tracker, watchlist app, track movies, track TV shows, movie watchlist, TV show watchlist, what to watch next"
        jsonLd={[
          toBreadcrumbJsonLd([{ name: "Home", path: "/" }]),
          toFaqJsonLd(faqItems),
        ]}
      />

      <HeroSection />

      <section className="page-container space-y-5 pb-24 pt-6 sm:pt-7 md:space-y-8 md:pb-0 md:pt-8">
        {authLoading ? (
          <AuthHomeSkeleton />
        ) : user ? (
          <>
            <MotionRevealSection tone="standard" delayClassName="delay-75" accentOpacityClassName="opacity-25">
              <UpNextCommandCenter />
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-100" accentOpacityClassName="opacity-22">
              <ContinueWatching />
            </MotionRevealSection>
              {!hasLibraryActivity ? (
                <MotionRevealSection tone="soft" delayClassName="delay-150">
                  <ActivationJourney />
                </MotionRevealSection>
              ) : null}
              <MotionRevealSection tone="bold" delayClassName="delay-150" accentOpacityClassName="opacity-16">
              <DailyCheckInCard />
            </MotionRevealSection>
            <MotionRevealSection tone="bold" delayClassName="delay-200" accentOpacityClassName="opacity-14">
              <CineQuestHub limit={2} />
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-16">
              {freshDiscoverySection}
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
            <MotionRevealSection tone="soft" delayClassName="delay-250" accentOpacityClassName="opacity-22">
              {discoveryHubSection}
            </MotionRevealSection>
            <MotionRevealSection tone="bold" delayClassName="delay-300" accentOpacityClassName="opacity-20">
              <CommunityActivityFeed />
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-300" accentOpacityClassName="opacity-18">
              <SuggestedPeopleRail />
            </MotionRevealSection>
            {hasLibraryActivity ? (
              <MotionRevealSection tone="soft" delayClassName="delay-250" accentOpacityClassName="opacity-18">
                <HomeStatsSnapshot watched={watched} watchlist={watchlist} />
              </MotionRevealSection>
            ) : null}
          </>
        ) : (
          <>
            <MotionRevealSection tone="soft" delayClassName="delay-75" accentOpacityClassName="opacity-16">
              <GuestSyncBanner />
            </MotionRevealSection>
            {guestJourneySection ? (
              <MotionRevealSection tone="bold" delayClassName="delay-100" accentOpacityClassName="opacity-24">
                {guestJourneySection}
              </MotionRevealSection>
            ) : null}
            <MotionRevealSection tone="soft" delayClassName="delay-150" accentOpacityClassName="opacity-22">
              {freshDiscoverySection}
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-150" accentOpacityClassName="opacity-20">
              {discoveryHubSection}
            </MotionRevealSection>
            <MotionRevealSection tone="soft" delayClassName="delay-250" accentOpacityClassName="opacity-18">
              <SuggestedPeopleRail />
            </MotionRevealSection>
            {watchlistSection ? (
              <MotionRevealSection tone="soft" delayClassName="delay-250" accentOpacityClassName="opacity-22">
                {watchlistSection}
              </MotionRevealSection>
            ) : null}
            {!shouldGateRecommendations && (
              <MotionRevealSection tone="bold" delayClassName="delay-300" accentOpacityClassName="opacity-26">
                {personalizedSection}
              </MotionRevealSection>
            )}
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
      </section>
    </div>
  );
}
