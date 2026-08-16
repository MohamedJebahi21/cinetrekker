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
import { ContinueWatching } from "@/components/ContinueWatching";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLists } from "@/contexts/UserListsContext";
import { useHomePageData } from "@/hooks/useHomePageData";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";
import { HomeSectionState } from "@/components/home/HomeSectionState";
import { HomeStatsSnapshot } from "@/components/home/HomeStatsSnapshot";
import { HomeWatchlistSkeleton } from "@/components/home/HomeWatchlistSkeleton";
import { SuggestedPeopleRail } from "@/components/home/SuggestedPeopleRail";
import { DailyReleaseHighlight } from "@/components/home/DailyReleaseHighlight";
import { CommunityActivityFeed } from "@/components/home/CommunityActivityFeed";
import { DailyCheckInCard } from "@/components/home/DailyCheckInCard";
import { CineQuestHub } from "@/components/quests/CineQuestHub";
import { DailyTriviaCard } from "@/components/home/DailyTriviaCard";
import { MotionRevealSection } from "@/components/motion/MotionRevealSection";
import { PaginationDots, PaginationDotStatic } from "@/components/ui/pagination-dots";
import GuestSyncBanner from "@/components/GuestSyncBanner";
import { trackProductEvent } from "@/lib/analytics";
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
  } = useHomePageData({
    language,
    watched,
    watchlist,
  });

  const newReleases = criticalDataQuery.data?.newReleases;
  const trendingWeek = criticalDataQuery.data?.trendingWeek;
  const watchlistTimedOut = useLoadingTimeout(watchlistPreviewQuery.isLoading, 20_000);
  const discoveryTimedOut = useLoadingTimeout(
    criticalDataQuery.isLoading || trendingDayQuery.isLoading,
  );
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
      className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-[radial-gradient(circle_at_top_right,hsla(var(--primary)/0.18),transparent_44%),linear-gradient(135deg,hsla(var(--card)/0.98),hsla(var(--background)/0.92))] p-5 shadow-[0_20px_56px_rgba(0,0,0,0.16)] md:p-7"
      aria-labelledby="guest-journey-title"
    >
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-end">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/85">
            {t("home.guestJourneyEyebrow", "Your watch journey starts here")}
          </p>
          <h2 id="guest-journey-title" className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {t("home.guestJourneyTitle", "Explore first. Make it yours when you are ready.")}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
            {t(
              "home.guestJourneyDescription",
              "Browse what is trending, save titles on this device, and create a free account only when you want your progress to follow you everywhere.",
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
              title: t("home.guestJourneyStep1Title", "Find a great next watch"),
              body: t("home.guestJourneyStep1Body", "Start with weekly highlights and fresh releases."),
            },
            {
              step: "02",
              title: t("home.guestJourneyStep2Title", "Save what interests you"),
              body: t("home.guestJourneyStep2Body", "Keep a local queue while you explore."),
            },
            {
              step: "03",
              title: t("home.guestJourneyStep3Title", "Sync when it matters"),
              body: t("home.guestJourneyStep3Body", "A free account keeps your progress across devices."),
            },
          ].map((item) => (
            <li key={item.step} className="rounded-2xl border border-border/60 bg-background/40 p-3.5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
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
    <section className="ct-panel overflow-hidden p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
            {t("home.discoveryHubLabel", "Discovery Hub")}
          </p>
          <h2 className="section-title mb-1">
            {t("home.discoveryHubTitle", "Pick your next move")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "home.discoveryHubDesc",
              "Use CineTrekker as a quick launchpad: search directly, jump into trending titles, open your watchlist, or go deeper into recommendations.",
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              t("home.discoveryHubTag1", "Fast search"),
              t("home.discoveryHubTag2", "Trending now"),
              t("home.discoveryHubTag3", "Personalized picks"),
            ].map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded-full border border-border/60 bg-background/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px] lg:grid-cols-1 xl:min-w-[360px] xl:grid-cols-2">
          {[
            {
              href: "/search",
              label: t("nav.search", "Search"),
              desc: t("home.discoveryHubSearchDesc", "Find a movie, show, or person fast."),
              icon: Search,
            },
            {
              href: "/trending",
              label: t("nav.trending", "Trending"),
              desc: t("home.discoveryHubTrendingDesc", "See what is moving right now."),
              icon: Flame,
            },
            {
              href: "/watchlist",
              label: t("nav.watchlist", "Watchlist"),
              desc: t("home.discoveryHubWatchlistDesc", "Continue from the titles you saved."),
              icon: Bookmark,
            },
            {
              href: user ? "/recommendations" : "/signup",
              label: user
                ? t("nav.recommendations", "Recommendations")
                : t("nav.signUp", "Get Started"),
              desc: user
                ? t("home.discoveryHubRecsDesc", "Open your taste-matched picks.")
                : t("home.discoveryHubSignupDesc", "Create an account to sync your activity."),
              icon: Sparkles,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="group rounded-2xl border border-border/60 bg-background/35 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-background/50"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary transition-colors group-hover:bg-primary/18">
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
            <MotionRevealSection tone="standard" delayClassName="delay-75" accentOpacityClassName="opacity-25">
              <ContinueWatching />
            </MotionRevealSection>
            <MotionRevealSection tone="bold" delayClassName="delay-100" accentOpacityClassName="opacity-24">
              <DailyReleaseHighlight />
            </MotionRevealSection>
            <MotionRevealSection tone="bold" delayClassName="delay-150" accentOpacityClassName="opacity-18">
              <DailyCheckInCard />
            </MotionRevealSection>
            <MotionRevealSection tone="bold" delayClassName="delay-200" accentOpacityClassName="opacity-16">
              <CineQuestHub limit={2} />
            </MotionRevealSection>
            <MotionRevealSection tone="bold" delayClassName="delay-250" accentOpacityClassName="opacity-14">
              <DailyTriviaCard />
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
      </main>
    </div>
  );
}
