import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type TouchEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBackdropUrl, getImageUrl, getMediaTitle, getTrending } from "@/services/tmdb";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { useUserLists } from "@/contexts/UserListsContext";
import { useAuth } from "@/contexts/AuthContext";

const AUTO_PLAY_MS = 6000;
const SWIPE_THRESHOLD = 42;

type TouchPoint = { x: number; y: number };
type HeroSlide = {
  id: number;
  title: string;
  overview: string;
  media_type: "movie" | "tv";
  backdrop_path: string | null;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  source: "live" | "fallback";
};

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);
  const { t, i18n } = useTranslation();
  const {
    addToWatchlist,
    removeFromWatchlist,
    addToWatched,
    removeFromWatched,
    isInWatchlist,
    isWatched,
    watched,
    watchlist,
  } = useUserLists();
  const { user } = useAuth();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const prefersReducedMotion = useReducedMotion();
  const language = i18n.language;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<TouchPoint | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const queueContainerRef = useRef<HTMLDivElement>(null);

  const handleParallax = (e: React.MouseEvent<HTMLElement>) => {
    if (window.innerWidth < 1024 || prefersReducedMotion) return;
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offsetX = (e.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({
      x: offsetX * 18,
      y: offsetY * 14,
    });
  };

  const resetParallax = () => setParallax({ x: 0, y: 0 });

  const { data: weeklyResponse } = useQuery({
    queryKey: ["hero-top-weekly", language, includeAdult],
    queryFn: () => getTrending("all", "week", language, 1, includeAdult),
  });

  const fallbackSlides = useMemo<HeroSlide[]>(
    () => [
      {
        id: 900001,
        title: t("home.heroFallbackSlideOne", "Track every title in one clean command center"),
        overview: t(
          "home.heroFallbackSlideOneOverview",
          "Keep watchlist decisions, finished titles, and discovery in one premium workflow built to stay readable and fast.",
        ),
        media_type: "movie",
        backdrop_path: null,
        poster_path: null,
        release_date: "2026",
        vote_average: 9.2,
        source: "fallback",
      },
      {
        id: 900002,
        title: t("home.heroFallbackSlideTwo", "Surface the next best watch without the mess"),
        overview: t(
          "home.heroFallbackSlideTwoOverview",
          "CineTrekker turns trending titles and saved signals into a calmer dashboard, so your next pick is always easy to find.",
        ),
        media_type: "tv",
        backdrop_path: null,
        poster_path: null,
        first_air_date: "2026",
        vote_average: 9.0,
        source: "fallback",
      },
      {
        id: 900003,
        title: t("home.heroFallbackSlideThree", "From discovery to watched, the whole flow feels intentional"),
        overview: t(
          "home.heroFallbackSlideThreeOverview",
          "Start with a curated product preview instantly, then let live release data fill in around a hero that never drops out.",
        ),
        media_type: "movie",
        backdrop_path: null,
        poster_path: null,
        release_date: "2026",
        vote_average: 8.9,
        source: "fallback",
      },
    ],
    [t],
  );

  const topWeekly = useMemo<HeroSlide[]>(
    () =>
      (weeklyResponse?.results || []).slice(0, 5).map((item) => ({
        id: item.id,
        title: getMediaTitle(item),
        overview: item.overview || "",
        media_type: item.media_type === "tv" ? "tv" : "movie",
        backdrop_path: item.backdrop_path ?? null,
        poster_path: item.poster_path ?? null,
        release_date: item.release_date,
        first_air_date: item.first_air_date,
        vote_average: item.vote_average ?? 0,
        source: "live",
      })),
    [weeklyResponse],
  );

  const heroSlides = topWeekly.length > 0 ? topWeekly : fallbackSlides;

  useEffect(() => {
    if (prefersReducedMotion || heroSlides.length <= 1 || isPaused) return;
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % heroSlides.length);
    }, AUTO_PLAY_MS);
    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion, heroSlides.length, isPaused, activeIndex]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const next = heroSlides[(activeIndex + 1) % heroSlides.length];
    if (!next?.backdrop_path) return;
    const img = new Image();
    img.src = getBackdropUrl(next.backdrop_path, "w1280") || "";
  }, [activeIndex, heroSlides]);

  useEffect(() => {
    if (!queueContainerRef.current) return;
    const container = queueContainerRef.current;
    
    // Slight delay to ensure DOM is updated including dimensions
    const timeoutToScroll = setTimeout(() => {
      const activeBtn = container.children[activeIndex] as HTMLElement;
      if (activeBtn) {
        const scrollLeft =
          activeBtn.offsetLeft -
          container.offsetLeft -
          container.clientWidth / 2 +
          activeBtn.clientWidth / 2;
        
        container.scrollTo({
          left: scrollLeft,
          behavior: "smooth",
        });
      }
    }, 50);

    return () => clearTimeout(timeoutToScroll);
  }, [activeIndex]);

  const activeItem = heroSlides[activeIndex];
  const activeTitle = activeItem.title;
  // Responsive backdrop: w780 on mobile saves ~200 KB on LCP image.
  // We read innerWidth at render time (not a resize listener) because this
  // only affects which src is used on paint — resize is not a common case.
  const heroImageSize =
    typeof window !== "undefined" && window.innerWidth < 768 ? "w780" : "w1280";
  const heroImage = activeItem.backdrop_path
    ? getBackdropUrl(activeItem.backdrop_path, heroImageSize) || ""
    : "";
  const posterImage = activeItem.poster_path
    ? getImageUrl(activeItem.poster_path, "w342")
    : heroImage;
  const activeYear =
    activeItem.release_date?.slice(0, 4) ||
    activeItem.first_air_date?.slice(0, 4) ||
    "";
  const activeMediaType = activeItem.media_type === "tv" ? "tv" : "movie";
  const inWatchlist = isInWatchlist(activeItem.id, activeMediaType);
  const inWatched = isWatched(activeItem.id, activeMediaType);
  const watchlistCount = watchlist.length;
  const watchedCount = watched.length;
  const personalizedCount = Math.max(watchlistCount + watchedCount, 12);
  const isLiveSlide = activeItem.source === "live";
  const detailsHref = isLiveSlide ? `/${activeMediaType}/${activeItem.id}` : "/discover";
  const primaryActionLabel = isLiveSlide
    ? t("common.details", "Details")
    : t("home.exploreCatalog", "Explore Catalog");

  const goToSlide = (index: number) => {
    const total = heroSlides.length;
    setActiveIndex(((index % total) + total) % total);
  };

  const handleTouchStart = (e: TouchEvent<HTMLElement>) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setIsPaused(true);
  };

  const handleTouchEnd = (e: TouchEvent<HTMLElement>) => {
    if (!touchStart) {
      setIsPaused(false);
      return;
    }

    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;

    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      goToSlide(activeIndex + (dx < 0 ? 1 : -1));
    }

    setTouchStart(null);
    setIsPaused(false);
  };

  const td = prefersReducedMotion ? 0 : 0.45;
  const primaryCta = user ? "/discover" : "/signup";
  const secondaryCta = user ? "/watchlist" : "/discover";

  const suppressActionNavigation = (event?: {
    preventDefault: () => void;
    stopPropagation: () => void;
  }) => {
    event?.preventDefault();
    event?.stopPropagation();
  };

  return (
    <section
      ref={heroRef}
      className="relative isolate overflow-hidden border-b border-border/40 bg-[radial-gradient(circle_at_top_left,rgba(217,4,41,0.2),transparent_24%),radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_50%_100%,rgba(217,4,41,0.1),transparent_30%),linear-gradient(180deg,#05060a_0%,#090b11_52%,#0d1118_100%)]"
      onMouseLeave={resetParallax}
      onMouseMove={handleParallax}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => setIsPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-12 h-56 w-56 rounded-full bg-primary/18 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-white/8 blur-3xl" />
        <div className="absolute left-[44%] top-24 h-40 w-40 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_0,transparent_18%,transparent_78%,rgba(255,255,255,0.04)_100%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <div className="page-container relative z-10 py-8 sm:py-10 md:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:gap-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("home.heroBadge", "Premium Watch Tracking")}
            </div>

            <h1 className="title-display mt-5 max-w-xl text-balance text-4xl font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:text-5xl lg:text-[4.5rem]">
              {t(
                "home.heroHeadline",
                "A sharper way to track movies, series, and what comes next.",
              )}
            </h1>

            <p className="mt-6 max-w-[40rem] text-base leading-8 text-white/70 sm:text-[1.15rem]">
              {t(
                "home.heroSubheadline",
                "CineTrekker gives you a premium command center for watchlists, finished titles, fresh releases, and personalized picks that stay organized across every session.",
              )}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="btn-primary-glow h-12 rounded-2xl px-6 text-base font-semibold shadow-[0_24px_70px_rgba(217,4,41,0.35)]">
                <Link to={primaryCta}>
                  {user
                    ? t("home.openDashboard", "Open My Dashboard")
                    : t("home.startFree", "Start Free")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-2xl border-white/14 bg-white/[0.04] px-6 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                <Link to={secondaryCta}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {user
                    ? t("home.viewWatchlist", "View Watchlist")
                    : t("home.exploreCatalog", "Explore Catalog")}
                </Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: t("home.heroStatOne", "Tracked Titles"),
                  value: `${watchlistCount + watchedCount}+`,
                  helper: t("home.heroStatOneHelper", "Your live library"),
                },
                {
                  label: t("home.heroStatTwo", "Personalized Signals"),
                  value: `${personalizedCount}`,
                  helper: t("home.heroStatTwoHelper", "Based on your saves"),
                },
                {
                  label: t("home.heroStatThree", "Weekly Discovery"),
                  value: `${heroSlides.length}`,
                  helper:
                    topWeekly.length > 0
                      ? t("home.heroStatThreeHelper", "Live trending feed")
                      : t("home.heroStatThreeFallbackHelper", "Curated hero highlights"),
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/46">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-white/58">{stat.helper}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/56">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                {t("home.heroPillOne", "Unified watchlist + watched flow")}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                {t("home.heroPillTwo", "Discovery built from live trends")}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                {t("home.heroPillThree", "Guest mode and account sync")}
              </span>
            </div>
          </div>

          <div className="relative" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
            <div
              className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] p-3 shadow-[0_35px_100px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
              style={
                prefersReducedMotion
                  ? undefined
                  : {
                      transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
                    }
              }
            >
              <div className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,#0d1118_0%,#0d1219_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center justify-between border-b border-white/8 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                      {t("home.heroPreviewLabel", "Product Preview")}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                      {t("home.heroPreviewTitle", "Your media dashboard")}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {t("home.heroPreviewStatus", "Live now")}
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {[
                        {
                          label: t("nav.watchlist", "Watchlist"),
                          value: watchlistCount,
                        },
                        {
                          label: t("nav.watched", "Watched"),
                          value: watchedCount,
                        },
                        {
                          label: t("home.heroQueueHealth", "Health"),
                          value: `${Math.min(98, 72 + watchlistCount)}%`,
                        },
                      ].map((metric) => (
                        <div
                          key={metric.label}
                          className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-2 sm:p-3"
                        >
                          <p className="truncate text-[10px] text-white/45 sm:text-xs">{metric.label}</p>
                          <p className="mt-1 text-lg font-semibold tracking-[-0.04em] text-white sm:mt-2 sm:text-2xl">
                            {metric.value}
                          </p>
                        </div>
                      ))}
                  </div>

                  <div className="space-y-4">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`hero-dashboard-${activeItem.id}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: td, ease: "easeOut" }}
                        className="overflow-hidden rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,#10151d_0%,#0d1219_100%)] shadow-[0_16px_36px_rgba(0,0,0,0.22)]"
                      >
                        <div className="relative h-[160px] overflow-hidden sm:h-[280px]">
                          {heroImage ? (
                            <img
                              src={heroImage}
                              alt=""
                              aria-hidden="true"
                              loading="eager"
                              fetchPriority="high"
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,4,41,0.24),transparent_26%),linear-gradient(135deg,#181b23_0%,#0d1017_52%,#090b10_100%)]" />
                          )}
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,18,0.06)_0%,rgba(10,12,18,0.28)_32%,rgba(10,12,18,0.94)_100%)]" />
                          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                                {t("home.heroNowSurfacing", "Now Surfacing")}
                              </span>
                              {activeYear ? (
                                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/72">
                                  {activeYear}
                                </span>
                              ) : null}
                              {activeItem.vote_average > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/72">
                                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                  {activeItem.vote_average.toFixed(1)}
                                </span>
                              ) : null}
                              {!isLiveSlide ? (
                                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-white/84">
                                  {t("home.heroFallbackBadge", "Always-on product preview")}
                                </span>
                              ) : null}
                            </div>
                              <h3 className="mt-2 text-xl font-semibold tracking-tight text-white sm:mt-3 sm:text-[2rem] sm:tracking-[-0.04em]">
                                {activeTitle}
                              </h3>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/78 sm:mt-3 sm:line-clamp-4 sm:max-w-2xl sm:text-[1.02rem] sm:leading-7">
                              {activeItem.overview ||
                                t(
                                  "home.heroFallbackOverview",
                                  "Track this title, add it to your queue, and keep its next step visible inside your dashboard.",
                                )}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4 p-4 lg:grid lg:grid-cols-[150px_minmax(0,1fr)] lg:gap-5 lg:p-5">
                          <div className="flex gap-4 lg:contents">
                            <div className="w-[90px] shrink-0 overflow-hidden rounded-2xl border border-white/8 bg-white/4 shadow-[0_18px_40px_rgba(0,0,0,0.32)] sm:w-[130px] lg:h-full lg:w-full">
                              {posterImage ? (
                                <img
                                  src={posterImage}
                                  alt={activeTitle}
                                  loading="lazy"
                                  className="aspect-[2/3] w-full object-cover lg:aspect-auto lg:h-full lg:min-h-[248px]"
                                />
                              ) : (
                                <div className="flex aspect-[2/3] w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(217,4,41,0.2),transparent_36%),linear-gradient(180deg,#171a21_0%,#0d1117_100%)] p-2 text-center lg:min-h-[248px]">
                                  <span className="title-display text-xs font-semibold leading-tight text-white/92 sm:text-sm">
                                    {activeTitle}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-1 flex-col justify-center space-y-4">
                              <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-3 sm:p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
                                  <div className="max-w-xl">
                                    <p className="text-sm font-medium text-white">
                                      {t("home.heroWorkflowTitle", "Decision-ready")}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/62 sm:text-sm sm:leading-7">
                                      {t(
                                        "home.heroWorkflowCopy",
                                        "Jump from discovery to save without losing context.",
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-auto flex flex-wrap items-center gap-2 sm:gap-3">
                                <Button asChild className="h-10 grow justify-center rounded-xl bg-red-600 px-3 text-xs font-semibold hover:bg-red-700 sm:h-11 sm:grow-0 sm:rounded-2xl sm:px-5 sm:text-sm">
                                  <Link to={detailsHref}>
                                    {primaryActionLabel}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                  </Link>
                                </Button>
                              {isLiveSlide ? (
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-10 rounded-xl border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white hover:bg-white/10 hover:text-white sm:h-11 sm:rounded-2xl sm:px-4 sm:text-sm"
                                      onClick={(event) => {
                                        suppressActionNavigation(event);
                                        void (inWatchlist
                                          ? removeFromWatchlist(activeItem.id, activeMediaType)
                                          : addToWatchlist(activeItem.id, activeMediaType));
                                      }}
                                    >
                                      <Bookmark className={cn("mr-2 h-4 w-4", inWatchlist && "fill-white")} />
                                      <span className="truncate">
                                        {inWatchlist
                                          ? t("actions.inWatchlist", "In Watchlist")
                                          : t("actions.addToWatchlist", "Watchlist")}
                                      </span>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className={cn(
                                        "h-10 rounded-xl border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white hover:bg-white/10 hover:text-white sm:h-11 sm:rounded-2xl sm:px-4 sm:text-sm",
                                        inWatched && "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
                                      )}
                                      onClick={(event) => {
                                        suppressActionNavigation(event);
                                        void (inWatched
                                          ? removeFromWatched(activeItem.id, activeMediaType)
                                          : addToWatched(
                                              activeItem.id,
                                              activeMediaType,
                                              undefined,
                                              undefined,
                                              "completed",
                                            ));
                                      }}
                                    >
                                      <Check className="mr-2 h-4 w-4" />
                                      <span className="truncate">
                                        {inWatched
                                          ? t("actions.watched", "Watched")
                                          : t("actions.markAsWatched", "Watched")}
                                      </span>
                                    </Button>
                                </div>
                              ) : (
                                <Button
                                  asChild
                                  variant="outline"
                                  className="h-11 rounded-2xl border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
                                >
                                  <Link to={primaryCta}>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    {t("home.startFree", "Start Free")}
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    <div className="space-y-3 rounded-3xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">
                          {t("home.heroTrendingPanel", "Trending Queue")}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => goToSlide(activeIndex - 1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white"
                            aria-label={t("hero.previousSlide", "Previous slide")}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => goToSlide(activeIndex + 1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/10 hover:text-white"
                            aria-label={t("hero.nextSlide", "Next slide")}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div 
                        ref={queueContainerRef}
                        className="hide-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1"
                      >
                        {heroSlides.map((item, index) => {
                          const isActive = index === activeIndex;
                          const itemTitle = item.title;
                          const thumb = item.poster_path
                            ? getImageUrl(item.poster_path, "w185")
                            : item.backdrop_path
                              ? getBackdropUrl(item.backdrop_path, "w300") || ""
                              : "";

                          return (
                            <button
                              key={`hero-sidebar-${item.id}-${index}`}
                              type="button"
                              onClick={() => goToSlide(index)}
                              className={cn(
                                "flex min-w-[200px] flex-[0_0_200px] items-center gap-3 rounded-2xl border px-2.5 py-2.5 text-left transition sm:min-w-[260px] sm:flex-[0_0_260px] sm:px-3 sm:py-3",
                                isActive
                                  ? "border-primary/40 bg-primary/12 shadow-[0_12px_32px_rgba(217,4,41,0.16)]"
                                  : "border-white/8 bg-white/[0.03] hover:bg-white/[0.07]",
                              )}
                              aria-current={isActive ? "true" : undefined}
                            >
                              <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#23131a_0%,#120e15_100%)] text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72">
                                    {String(index + 1).padStart(2, "0")}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm font-semibold leading-6 text-white">
                                  {itemTitle}
                                </p>
                                <p className="mt-1 text-xs text-white/52">
                                  {item.media_type === "tv"
                                    ? t("common.tvShow", "TV Show")
                                    : t("common.movie", "Movie")}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex h-1.5 w-full gap-[3px] overflow-hidden rounded-full">
                        {heroSlides.map((item, index) => {
                          const isActive = index === activeIndex;
                          return (
                            <button
                              key={`hero-progress-${item.id}-${index}`}
                              type="button"
                              onClick={() => goToSlide(index)}
                              className="relative h-full flex-1 overflow-hidden bg-white/14 outline-none hover:bg-white/20 transition-colors"
                              aria-label={t("hero.goToSlide", "Go to slide {{index}}", { index: index + 1 })}
                            >
                              <motion.div
                                className="absolute left-0 top-0 h-full bg-primary"
                                initial={{ width: index < activeIndex ? "100%" : "0%" }}
                                animate={{ 
                                  width: isActive ? "100%" : (index < activeIndex ? "100%" : "0%") 
                                }}
                                transition={{
                                  width: { 
                                    duration: isActive ? (AUTO_PLAY_MS / 1000) : 0.3, 
                                    ease: isActive ? "linear" : "easeOut" 
                                  },
                                }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
