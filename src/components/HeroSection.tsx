import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark, Check, Info, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type TouchEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBackdropUrl, getImageUrl, getMediaTitle, getTrending } from "@/services/tmdb";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { useUserLists } from "@/contexts/UserListsContext";

const AUTO_PLAY_MS = 6000;
const SWIPE_THRESHOLD = 42;

type TouchPoint = { x: number; y: number };

export function HeroSection() {
  const { t, i18n } = useTranslation();
  const {
    addToWatchlist, removeFromWatchlist,
    addToWatched, removeFromWatched,
    isInWatchlist, isWatched,
  } = useUserLists();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const prefersReducedMotion = useReducedMotion();
  const language = i18n.language;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<TouchPoint | null>(null);
  // Pick the hero backdrop resolution by viewport so phones don't download the
  // large desktop image. Only the matching layout block is mounted below, so a
  // single correctly-sized image loads instead of both. Initialised
  // synchronously so the eager LCP image requests the right size on first paint
  // (even when the trending query is already cached).
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobileViewport(window.innerWidth < 768);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const { data: weeklyResponse } = useQuery({
    queryKey: ["hero-top-weekly", language, includeAdult],
    queryFn: () => getTrending("all", "week", language, 1, includeAdult),
  });

  const topWeekly = useMemo(
    () => (weeklyResponse?.results || []).filter((item) => item.backdrop_path).slice(0, 5),
    [weeklyResponse],
  );

  useEffect(() => { setActiveIndex(0); }, [topWeekly.length]);

  // Le minuteur évite les mises à jour React continues pendant l'animation.
  useEffect(() => {
    if (prefersReducedMotion || topWeekly.length <= 1 || isPaused) return;
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % topWeekly.length);
    }, AUTO_PLAY_MS);
    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion, topWeekly.length, isPaused, activeIndex]);

  // Preload next image
  useEffect(() => {
    if (topWeekly.length <= 1) return;
    const next = topWeekly[(activeIndex + 1) % topWeekly.length];
    if (!next?.backdrop_path) return;
    const img = new Image();
    img.src = getBackdropUrl(next.backdrop_path, isMobileViewport ? "w780" : "w1280") || "";
  }, [activeIndex, topWeekly, isMobileViewport]);

  if (topWeekly.length === 0) return null;

  const activeItem = topWeekly[activeIndex];
  const activeTitle = getMediaTitle(activeItem);
  const heroImage = activeItem.backdrop_path
    ? getBackdropUrl(activeItem.backdrop_path, isMobileViewport ? "w780" : "w1280") || ""
    : "";
  const activeYear =
    activeItem.release_date?.slice(0, 4) ||
    activeItem.first_air_date?.slice(0, 4) || "";
  const activeMediaType = activeItem.media_type === "tv" ? "tv" : "movie";
  const inWatchlist = isInWatchlist(activeItem.id, activeMediaType);
  const inWatched = isWatched(activeItem.id, activeMediaType);

  const goToSlide = (index: number) => {
    const total = topWeekly.length;
    setActiveIndex(((index % total) + total) % total);
  };

  const handleTouchStart = (e: TouchEvent<HTMLElement>) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setIsPaused(true);
  };

  const handleTouchEnd = (e: TouchEvent<HTMLElement>) => {
    if (!touchStart) { setIsPaused(false); return; }
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      goToSlide(activeIndex + (dx < 0 ? 1 : -1));
    }
    setTouchStart(null);
    setIsPaused(false);
  };

  const td = prefersReducedMotion ? 0 : 0.5;

  return (
    <section
      className="w-full border-b border-border/30 bg-background"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => setIsPaused(false)}
    >
      {/* ── Desktop layout: full-width backdrop with floating elements ── */}
      {!isMobileViewport && (
      <div className="relative min-h-[550px] lg:min-h-[600px] w-full overflow-hidden">
        {/* Animated backdrop */}
        <AnimatePresence mode="wait">
          <motion.img
            key={`hero-bg-${activeItem.id}`}
            src={heroImage}
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: td }}
          />
        </AnimatePresence>

        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20 z-10" />

        {/* Content anchored to middle-left */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`hero-content-${activeItem.id}`}
            className="absolute inset-y-0 left-0 flex flex-col justify-center p-8 lg:p-16 z-20 max-w-[700px] mt-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: td, ease: "easeOut" }}
          >
            {/* Kicker */}
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {t("home.topWatchedThisWeekKicker", "Weekly Spotlight")}
            </p>

            <p className="max-w-xl text-sm leading-6 text-white/72 lg:text-base">
              {t(
                "home.heroValueProp",
                "Discover, track, and discuss what to watch next in one place.",
              )}
            </p>

            {/* Title */}
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white drop-shadow-md lg:text-5xl xl:text-6xl">
              {activeTitle}
            </h1>

            {/* Meta badges */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeItem.vote_average > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-primary ring-1 ring-white/10">
                  ★ {activeItem.vote_average.toFixed(1)}
                </span>
              )}
              {activeYear && (
                <span className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/10">
                  {activeYear}
                </span>
              )}
              <span className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/10">
                {activeItem.media_type === "tv" ? t("common.tvShow", "TV Show") : t("common.movie", "Movie")}
              </span>
            </div>

            {/* Description */}
            {activeItem.overview && (
              <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/70 lg:text-base">
                {activeItem.overview}
              </p>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild className="h-11 rounded-full bg-white text-black hover:bg-white/90 font-bold px-6 shadow-lg">
                <Link to={`/${activeMediaType}/${activeItem.id}`}>
                  <Info className="mr-2 h-4.5 w-4.5" />
                  {t("common.details", "Details")}
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-full border-white/20 bg-black/40 text-white hover:bg-white/10 font-semibold px-6 backdrop-blur-sm"
                onClick={() => { void (inWatchlist ? removeFromWatchlist(activeItem.id, activeMediaType) : addToWatchlist(activeItem.id, activeMediaType)); }}
              >
                <Bookmark className={cn("mr-2 h-4.5 w-4.5", inWatchlist && "fill-white")} />
                {inWatchlist ? t("actions.inWatchlist", "In Watchlist") : t("actions.addToWatchlist", "Add to Watchlist")}
              </Button>
              <Button
                variant="outline"
                className={cn(
                  "h-11 rounded-full border-white/20 bg-black/40 text-white hover:bg-white/10 font-semibold px-6 backdrop-blur-sm",
                  inWatched && "border-green-400/40 bg-green-900/20 text-green-300"
                )}
                onClick={() => { void (inWatched ? removeFromWatched(activeItem.id, activeMediaType) : addToWatched(activeItem.id, activeMediaType, undefined, undefined, "completed")); }}
              >
                <Check className="mr-2 h-4.5 w-4.5" />
                {inWatched ? t("actions.watched", "Watched") : t("actions.markAsWatched", "Mark as Watched")}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Floating poster carousel in bottom right */}
        <div className="absolute bottom-8 right-8 lg:bottom-12 lg:right-16 z-20 flex items-center gap-3">
          {topWeekly.map((item, index) => {
            const isActive = index === activeIndex;
            const thumb = item.poster_path
              ? getImageUrl(item.poster_path, "w185")
              : item.backdrop_path
                ? getBackdropUrl(item.backdrop_path, "w300") || ""
                : "";

            return (
              <button
                key={`hero-floating-${item.id}-${index}`}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Select featured title: ${getMediaTitle(item)}`}
                title={getMediaTitle(item)}
                className={cn(
                  "relative h-20 w-14 lg:h-24 lg:w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-300 hover:scale-105",
                  isActive
                    ? "border-primary shadow-[0_0_12px_hsl(var(--primary)/0.58)] opacity-100 scale-105 z-10"
                    : "border-white/10 opacity-50 hover:opacity-80"
                )}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-white/5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Progress bars overlay (bottom of image, subtle) */}
        <div className="absolute bottom-0 left-0 right-0 z-30 flex gap-1 px-8 lg:px-16 pb-0">
          {topWeekly.map((item, i) => {
            const isActive = i === activeIndex;
            return (
              <button
                key={`pb-${item.id}-${i}`}
                type="button"
                aria-label={`Go to weekly spotlight slide ${i + 1} of ${topWeekly.length}`}
                onClick={() => goToSlide(i)}
                className="group flex h-11 flex-1 items-end justify-center pb-0"
              >
                <div className="h-1 w-full overflow-hidden rounded-t-full bg-white/20 transition-all group-hover:bg-white/30">
                  <div
                    key={isActive ? `desktop-progress-${activeItem.id}` : `desktop-progress-${item.id}`}
                    className={cn(
                      "h-full bg-primary",
                      isActive && !prefersReducedMotion
                        ? "origin-left animate-hero-progress"
                        : i < activeIndex
                          ? "w-full"
                          : "w-0",
                    )}
                    style={{
                      animationPlayState: isPaused ? "paused" : "running",
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* ── Mobile layout: full-width stacked ── */}
      {isMobileViewport && (
      <div className="md:hidden">
        <div className="relative overflow-hidden bg-background">
          {/* Backdrop */}
          <div className="relative min-h-[54svh] sm:min-h-[60svh]">
            <AnimatePresence mode="wait">
              <motion.img
                key={`hero-mob-bg-${activeItem.id}`}
                src={heroImage}
                alt=""
                aria-hidden="true"
                loading="eager"
                className="absolute inset-0 h-full w-full object-cover object-center"
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: td }}
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(247,37,37,0.14),transparent_36%),linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.4)_45%,rgba(8,8,10,0.94)_100%)]" />

            <div className="absolute inset-x-4 top-4 flex items-center justify-between">
              <span className="inline-flex rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/75 backdrop-blur-md">
                {t("home.topWatchedThisWeekKicker", "Weekly Spotlight")}
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-white/60 backdrop-blur-md">
                {activeYear}
              </span>
            </div>

            <div className="absolute inset-x-4 bottom-3 flex gap-1">
              {topWeekly.map((item, i) => {
                const isActive = i === activeIndex;
                return (
                  <button
                    key={`mob-pb-${item.id}-${i}`}
                    type="button"
                    aria-label={`Go to weekly spotlight slide ${i + 1} of ${topWeekly.length}`}
                    onClick={() => goToSlide(i)}
                    className="group flex h-11 flex-1 items-center justify-center"
                  >
                    <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/20">
                      <div
                        key={isActive ? `mobile-progress-${activeItem.id}` : `mobile-progress-${item.id}`}
                        className={cn(
                          "h-full bg-primary",
                          isActive && !prefersReducedMotion
                            ? "origin-left animate-hero-progress"
                            : i < activeIndex
                              ? "w-full"
                              : "w-0",
                        )}
                        style={{
                          animationPlayState: isPaused ? "paused" : "running",
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Horizontal thumbnail strip */}
        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-2.5 pt-1.5">
          {topWeekly.map((item, index) => {
            const isActive = index === activeIndex;
            const thumb = item.backdrop_path
              ? getBackdropUrl(item.backdrop_path, "w300") || ""
              : "";
            return (
              <button
                key={`hero-mob-thumb-${item.id}-${index}`}
                type="button"
                onClick={() => goToSlide(index)}
                className={cn(
                  "flex-shrink-0 overflow-hidden rounded-md border transition h-11 w-[79px]",
                  isActive
                    ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.36)]"
                    : "border-white/10 opacity-60"
                )}
              >
                {thumb ? (
                  <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-white/5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Text content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`hero-mob-content-${activeItem.id}`}
            className="px-4 pb-2.5 pt-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: td }}
          >
            <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,17,19,0.98)_0%,rgba(12,12,14,0.94)_100%)] p-3 shadow-[0_-18px_60px_rgba(0,0,0,0.52)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="rounded-sm bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-white/70">
                    {activeItem.media_type === "tv" ? t("common.tvShow", "TV Show") : t("common.movie", "Movie")}
                  </span>
                  {activeYear && (
                    <span className="rounded-sm bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-white/70">
                      {activeYear}
                    </span>
                  )}
                  {activeItem.vote_average > 0 && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-white/70">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {activeItem.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80" aria-hidden="true">
                  <Info className="h-4.5 w-4.5" />
                </div>
              </div>

              <h2 className="mt-2 text-[20px] font-black leading-[0.98] tracking-[-0.04em] text-white">
                {activeTitle}
              </h2>

              <p className="mt-1.5 text-[13px] leading-6 text-white/68">
                {t(
                  "home.heroValueProp",
                  "Discover, track, and discuss what to watch next in one place.",
                )}
              </p>

              <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                <Button asChild className="h-11 rounded-2xl bg-white text-black font-bold hover:bg-white/90">
                  <Link to={`/${activeMediaType}/${activeItem.id}`}>
                    <Info className="mr-2 h-4 w-4" />{t("common.details", "Details")}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-2xl border-white/20 bg-black/20 text-white"
                  onClick={() => { void (inWatchlist ? removeFromWatchlist(activeItem.id, activeMediaType) : addToWatchlist(activeItem.id, activeMediaType)); }}
                  aria-label={
                    inWatchlist
                      ? t("actions.removeFromWatchlistTitle", "Remove {{title}} from watchlist", { title: activeTitle })
                      : t("actions.addToWatchlistTitle", "Add {{title}} to watchlist", { title: activeTitle })
                  }
                >
                  <Bookmark className={cn("h-4 w-4", inWatchlist && "fill-white")} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn("h-11 w-11 rounded-2xl border-white/20 bg-black/20 text-white", inWatched && "border-green-400/40 text-green-300")}
                  onClick={() => { void (inWatched ? removeFromWatched(activeItem.id, activeMediaType) : addToWatched(activeItem.id, activeMediaType, undefined, undefined, "completed")); }}
                  aria-label={
                    inWatched
                      ? t("actions.markUnwatchedTitle", "Mark {{title}} as not watched", { title: activeTitle })
                      : t("actions.markWatchedTitle", "Mark {{title}} as watched", { title: activeTitle })
                  }
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {activeItem.overview && (
            <div className="px-4 pb-2 pt-0.5">
              <p className="line-clamp-2 text-[12.5px] leading-5 text-white/62">
                {activeItem.overview}
              </p>
          </div>
        )}
      </div>
      )}
    </section>
  );
}
