import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark, Check, ChevronLeft, ChevronRight, Info, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useMemo, useState, type TouchEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMotionIntensityPreference } from "@/hooks/useMotionIntensityPreference";
import { getBackdropUrl, getImageUrl, getMediaTitle, getTrending } from "@/services/tmdb";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { useUserLists } from "@/contexts/UserListsContext";

const RemotionAurora = lazy(() =>
  import("@/components/motion/RemotionAurora").then((mod) => ({
    default: mod.RemotionAurora,
  })),
);

const AUTO_PLAY_MS = 5000;
const SWIPE_THRESHOLD = 42;

type TouchPoint = {
  x: number;
  y: number;
};

export function HeroSection() {
  const { t, i18n } = useTranslation();
  const {
    addToWatchlist,
    removeFromWatchlist,
    addToWatched,
    removeFromWatched,
    isInWatchlist,
    isWatched,
  } = useUserLists();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const prefersReducedMotion = useReducedMotion();
  const motionIntensity = useMotionIntensityPreference();
  const language = i18n.language;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [touchStart, setTouchStart] = useState<TouchPoint | null>(null);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);

  const { data: weeklyResponse } = useQuery({
    queryKey: ["hero-top-weekly", language, includeAdult],
    queryFn: () => getTrending("all", "week", language, 1, includeAdult),
  });

  const topWeekly = useMemo(
    () => (weeklyResponse?.results || []).filter((item) => item.backdrop_path).slice(0, 5),
    [weeklyResponse],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [topWeekly.length]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const updateViewport = () => setIsDesktopViewport(media.matches);

    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || topWeekly.length <= 1 || isPaused) return;

    const tickMs = 50;
    const step = 100 / (AUTO_PLAY_MS / tickMs);
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(100, current + step));
    }, tickMs);

    return () => window.clearInterval(timer);
  }, [prefersReducedMotion, topWeekly.length, isPaused, activeIndex]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (progress < 100 || topWeekly.length <= 1) return;

    setActiveIndex((current) => (current + 1) % topWeekly.length);
    setProgress(0);
  }, [prefersReducedMotion, progress, topWeekly.length]);

  useEffect(() => {
    if (topWeekly.length <= 1) return;

    const nextIndex = (activeIndex + 1) % topWeekly.length;
    const nextItem = topWeekly[nextIndex];
    if (!nextItem?.backdrop_path) return;

    const preloadImage = new Image();
    preloadImage.src = getBackdropUrl(nextItem.backdrop_path, "w1280");
  }, [activeIndex, topWeekly]);

  if (topWeekly.length === 0) {
    return null;
  }

  const activeItem = topWeekly[activeIndex];
  const activeTitle = getMediaTitle(activeItem);
  const activeBackdrop = activeItem.backdrop_path
    ? getBackdropUrl(activeItem.backdrop_path, "w1280")
    : null;
  const activePoster = activeItem.poster_path
    ? getImageUrl(activeItem.poster_path, "w500")
    : null;
  const activeVisual = activePoster || activeBackdrop;
  const heroImage = activeBackdrop || activeVisual || "";
  const activeYear =
    activeItem.release_date?.slice(0, 4) ||
    activeItem.first_air_date?.slice(0, 4) ||
    t("home.newRelease", "New");
  const activeMediaType = activeItem.media_type === "tv" ? "tv" : "movie";
  const inWatchlist = isInWatchlist(activeItem.id, activeMediaType);
  const inWatched = isWatched(activeItem.id, activeMediaType);

  const handleWatchlistToggle = async () => {
    if (inWatchlist) {
      await removeFromWatchlist(activeItem.id, activeMediaType);
      return;
    }

    await addToWatchlist(activeItem.id, activeMediaType);
  };

  const handleWatchedToggle = async () => {
    if (inWatched) {
      await removeFromWatched(activeItem.id, activeMediaType);
      return;
    }

    await addToWatched(activeItem.id, activeMediaType, undefined, undefined, "completed");
  };

  const goToSlide = (index: number) => {
    const total = topWeekly.length;
    const normalized = ((index % total) + total) % total;
    setActiveIndex(normalized);
    setProgress(0);
  };

  const goPrevious = () => {
    goToSlide(activeIndex - 1);
  };

  const goNext = () => {
    goToSlide(activeIndex + 1);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const transitionDuration = prefersReducedMotion ? 0 : 0.62;

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    const first = event.touches[0];
    setTouchStart({ x: first.clientX, y: first.clientY });
    setIsPaused(true);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (!touchStart) {
      setIsPaused(false);
      return;
    }

    const end = event.changedTouches[0];
    const deltaX = end.clientX - touchStart.x;
    const deltaY = end.clientY - touchStart.y;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrevious();
      }
    }

    setTouchStart(null);
    setIsPaused(false);
  };

  return (
    <section
      className="relative min-h-[32rem] overflow-hidden border-b border-border/40 bg-background sm:min-h-[34rem] md:min-h-[36rem]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={`hero-bg-${activeItem.id}`}
          src={heroImage}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-contain"
          initial={{ opacity: 0, scale: 1 }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          exit={{ opacity: 0, scale: 1 }}
          transition={{ duration: transitionDuration, ease: "easeInOut" }}
        />
      </AnimatePresence>

      {!prefersReducedMotion && motionIntensity !== "low" ? (
        <Suspense fallback={null}>
          <RemotionAurora className={motionIntensity === "high" ? "opacity-95" : "opacity-70"} />
        </Suspense>
      ) : null}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,16,0.05)_30%,rgba(2,6,16,0.72)_100%)]" />

      <div className="page-container relative z-[1] py-6 sm:py-8 md:py-10">
        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            {topWeekly.map((item, index) => {
              const isActive = index === activeIndex;
              const fill = isActive ? progress : index < activeIndex ? 100 : 0;
              return (
                <div
                  key={`hero-progress-${item.id}-${index}`}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20"
                  aria-hidden="true"
                >
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    animate={{ width: `${fill}%` }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeInOut" }}
                  />
                </div>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-[1.5rem] p-4 sm:p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={`hero-bleed-${activeItem.id}`}
                initial={{ opacity: 0, scale: 1.01 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.01 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.58, ease: "easeInOut" }}
                className="relative min-h-[19rem] overflow-hidden rounded-[1.25rem] sm:min-h-[22rem] md:min-h-[24rem]"
              >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,16,0.05)_40%,rgba(2,6,16,0.82)_100%)]" />

                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 md:p-6">
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="max-w-3xl"
                  >
                    <motion.p
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.42, ease: "easeInOut", delay: 0 }}
                      className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/85"
                    >
                      {t("home.topWatchedThisWeekKicker", "Weekly Spotlight")}
                    </motion.p>

                    <motion.h1
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut", delay: 0 }}
                      className="mt-2 max-w-3xl text-xl font-bold tracking-tight text-white sm:text-2xl md:text-4xl"
                    >
                      {activeTitle}
                    </motion.h1>

                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, ease: "easeInOut", delay: 0.1 }}
                      className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/84 sm:text-sm"
                    >
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                        {activeItem.media_type === "tv"
                          ? t("common.tvShow", "TV Show")
                          : t("common.movie", "Movie")}
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                        {activeYear}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                        <Star className="h-3.5 w-3.5 text-yellow-300" />
                        {activeItem.vote_average ? activeItem.vote_average.toFixed(1) : "-"}
                      </span>
                    </motion.div>

                    <motion.p
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, ease: "easeInOut", delay: 0.1 }}
                      className="mt-3 max-w-2xl rounded-lg bg-black/25 p-2 text-sm leading-6 text-white/82 backdrop-blur-[2px] sm:text-base sm:leading-7"
                    >
                      {activeItem.overview ||
                        t(
                          "home.featuredDescriptionFallback",
                          "Open this title to see details and add it to your watch flow.",
                        )}
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.48, ease: "easeInOut", delay: 0.2 }}
                      className="mt-4 flex flex-col gap-3 sm:flex-row"
                    >
                      <Button
                        asChild
                        className="btn-primary-glow h-11 transition duration-300 hover:scale-[1.03] hover:brightness-110"
                      >
                        <Link to={`/${activeMediaType}/${activeItem.id}`}>
                          <Info className="mr-2 h-4 w-4" />
                          {t("common.details", "Details")}
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 border-white/20 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => {
                          void handleWatchlistToggle();
                        }}
                      >
                        <Bookmark className="mr-2 h-4 w-4" />
                        {inWatchlist
                          ? t("nav.watchlist", "Watchlist")
                          : t("actions.addToWatchlist", "Add to Watchlist")}
                      </Button>
                      <Button
                        variant={inWatched ? "secondary" : "outline"}
                        className="h-11 border-white/20 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => {
                          void handleWatchedToggle();
                        }}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        {inWatched
                          ? t("nav.watched", "Watched")
                          : t("actions.markWatched", "Mark as Watched")}
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 hidden gap-2 md:grid md:grid-cols-2 lg:grid-cols-5">
              {topWeekly.map((item, index) => {
                const isActive = index === activeIndex;
                const itemTitle = getMediaTitle(item);
                const thumb = item.backdrop_path
                  ? getBackdropUrl(item.backdrop_path, "w300")
                  : "";
                return (
                  <button
                    key={`hero-thumb-${item.id}-${index}`}
                    type="button"
                    onClick={() => goToSlide(index)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-sm transition duration-300",
                      "hover:scale-[1.01] hover:border-primary/45 hover:bg-white/12",
                      isActive
                        ? "border-primary/70 bg-primary/20 text-white"
                        : "border-white/15 bg-white/6 text-white/80",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          loading="lazy"
                          className="h-10 w-16 rounded-md object-cover"
                        />
                      ) : null}
                      <span className="block truncate font-medium">{itemTitle}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between md:hidden">
              <div className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1 pb-1">
                {topWeekly.map((item, index) => {
                  const isActive = index === activeIndex;
                  const thumb = item.backdrop_path
                    ? getBackdropUrl(item.backdrop_path, "w300")
                    : "";
                  return (
                    <button
                      key={`hero-mobile-thumb-${item.id}-${index}`}
                      type="button"
                      onClick={() => goToSlide(index)}
                      className={cn(
                        "min-w-[120px] rounded-lg border px-3 py-2 text-left text-xs transition",
                        isActive
                          ? "border-primary/70 bg-primary/20 text-white"
                          : "border-white/15 bg-white/6 text-white/75",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            loading="lazy"
                            className="h-7 w-10 rounded object-cover"
                          />
                        ) : null}
                        <span className="block truncate">{getMediaTitle(item)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="ml-2 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-white"
                  onClick={goPrevious}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-white"
                  onClick={goNext}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="mt-4 hidden items-center justify-end gap-2 md:flex">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full text-white"
                onClick={goPrevious}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full text-white"
                onClick={goNext}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
