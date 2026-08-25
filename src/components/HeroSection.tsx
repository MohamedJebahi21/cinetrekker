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
import { buildMediaPath } from "@/lib/seo";

const SWIPE_THRESHOLD = 42;

type TouchPoint = { x: number; y: number };

function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduceMotion;
}

function HeroSectionSkeleton({ isMobileViewport }: { isMobileViewport: boolean }) {
  if (isMobileViewport) {
    return (
      <section className="w-full border-b border-border/30 bg-background" aria-busy="true" aria-label="Loading weekly spotlight">
        <div className="md:hidden">
          <h1 className="sr-only">CineTrekker movie and TV tracker</h1>
          <div className="min-h-[54svh] bg-card/45 skeleton-shimmer sm:min-h-[60svh]" />
          <div className="space-y-3 px-4 pb-3 pt-2">
            <div className="h-11 w-full rounded-md bg-card/45 skeleton-shimmer" />
            <div className="rounded-[1.75rem] border border-border/50 bg-card/45 p-4">
              <div className="h-5 w-2/3 rounded-md skeleton-shimmer" />
              <div className="mt-3 h-4 w-full rounded-md skeleton-shimmer" />
              <div className="mt-2 h-4 w-4/5 rounded-md skeleton-shimmer" />
              <div className="mt-4 h-11 rounded-2xl skeleton-shimmer" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full border-b border-border/30 bg-background" aria-busy="true" aria-label="Loading weekly spotlight">
      <div className="relative min-h-[550px] overflow-hidden bg-card/45 skeleton-shimmer lg:min-h-[600px]">
        <div className="absolute inset-y-0 left-0 flex w-full max-w-[700px] flex-col justify-center p-8 lg:p-16">
          <div className="h-4 w-32 rounded-md skeleton-shimmer" />
          <div className="mt-5 h-8 w-4/5 rounded-md skeleton-shimmer lg:h-12" />
          <div className="mt-5 h-4 w-full rounded-md skeleton-shimmer" />
          <div className="mt-3 h-4 w-3/4 rounded-md skeleton-shimmer" />
          <div className="mt-7 h-11 w-40 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </section>
  );
}

export function HeroSection() {
  const { t, i18n } = useTranslation();
  const {
    addToWatchlist, removeFromWatchlist,
    addToWatched, removeFromWatched,
    isInWatchlist, isWatched,
  } = useUserLists();
  const { strictFiltering, moderateFiltering } = useContentPolicy();
  const includeAdult = !(strictFiltering || moderateFiltering);
  const prefersReducedMotion = usePrefersReducedMotion();
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

  // Keep the initial above-the-fold image stable. Automatic rotation can replace
  // the largest contentful element long after first paint, worsening LCP. Users
  // can still choose any spotlight with the visible controls below.

  // Preload next image
  useEffect(() => {
    if (topWeekly.length <= 1) return;
    const next = topWeekly[(activeIndex + 1) % topWeekly.length];
    if (!next?.backdrop_path) return;
    const img = new Image();
    img.src = getBackdropUrl(next.backdrop_path, isMobileViewport ? "w780" : "w1280") || "";
  }, [activeIndex, topWeekly, isMobileViewport]);

  if (topWeekly.length === 0) {
    return <HeroSectionSkeleton isMobileViewport={isMobileViewport} />;
  }

  const activeItem = topWeekly[activeIndex];
  const activeTitle = getMediaTitle(activeItem);
  const heroImage = activeItem.backdrop_path
    ? getBackdropUrl(activeItem.backdrop_path, isMobileViewport ? "w780" : "w1280") || ""
    : "";
  const activeYear =
    activeItem.release_date?.slice(0, 4) ||
    activeItem.first_air_date?.slice(0, 4) || "";
  const activeMediaType = activeItem.media_type === "tv" ? "tv" : "movie";
  const activeMediaPath = buildMediaPath(activeMediaType, activeItem.id, activeTitle);
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
      <div className="relative min-h-[520px] lg:min-h-[560px] w-full overflow-hidden">
        {/* Animated backdrop */}
        <img
          key={`hero-bg-${activeItem.id}`}
          src={heroImage}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            !prefersReducedMotion && "animate-fade-in",
          )}
        />

        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-transparent z-10" />
        <div className="ct-hero-bottom-scrim absolute inset-0 z-10" />

        {/* Content anchored to middle-left */}
        <div
          key={`hero-content-${activeItem.id}`}
          className={cn(
            "absolute inset-y-0 left-0 z-20 mt-8 flex max-w-[700px] flex-col justify-center p-8 lg:p-16",
            !prefersReducedMotion && "animate-slide-up",
          )}
        >
            {/* Kicker */}
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {t("home.topWatchedThisWeekKicker", "Weekly Spotlight")}
            </p>

            <p className="max-w-xl text-sm leading-6 text-white/75 lg:text-base">
              {t(
                "home.heroValueProp",
                "Track what you watch, save what is next, and discover your next favorite in one place.",
              )}
            </p>

            {/* Title */}
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white drop-shadow-md lg:text-5xl xl:text-6xl">
              {activeTitle}
            </h1>

            {/* Meta badges */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-white/75">
              <span>{activeItem.media_type === "tv" ? t("common.tvShow", "TV Show") : t("common.movie", "Movie")}</span>
              {activeYear && <span aria-hidden="true">•</span>}
              {activeYear && <span>{activeYear}</span>}
              {activeItem.vote_average > 0 && (
                <><span aria-hidden="true">•</span><span className="text-primary">★ {activeItem.vote_average.toFixed(1)}</span></>
              )}
            </div>

            {/* Description */}
            {activeItem.overview && (
              <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/70 lg:text-base">
                {activeItem.overview}
              </p>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Button asChild className="h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90">
                <Link to={activeMediaPath}>
                  <Info className="mr-2 h-4.5 w-4.5" />
                  {t("common.details", "Details")}
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-lg border-white/20 bg-black/55 px-4 font-semibold text-white hover:bg-white/10"
                onClick={() => { void (inWatchlist ? removeFromWatchlist(activeItem.id, activeMediaType) : addToWatchlist(activeItem.id, activeMediaType)); }}
              >
                <Bookmark className={cn("mr-2 h-4.5 w-4.5", inWatchlist && "fill-white")} />
                {inWatchlist ? t("actions.inWatchlist", "In Watchlist") : t("actions.addToWatchlist", "Add to Watchlist")}
              </Button>
              <Button
                variant="outline"
                className={cn(
                  "h-11 rounded-lg border-white/15 bg-transparent px-3 font-medium text-white/75 hover:bg-white/10 hover:text-white",
                  inWatched && "border-green-400/40 bg-green-900/20 text-green-300"
                )}
                onClick={() => { void (inWatched ? removeFromWatched(activeItem.id, activeMediaType) : addToWatched(activeItem.id, activeMediaType, undefined, undefined, "completed")); }}
              >
                <Check className="mr-2 h-4.5 w-4.5" />
                {inWatched ? t("actions.watched", "Watched") : t("actions.markAsWatched", "Mark as Watched")}
              </Button>
            </div>
        </div>

        {/* Supporting poster treatment keeps the desktop hero balanced without competing with the primary title action. */}
        {activeItem.poster_path ? (
          <div className="ct-hero-supporting-poster">
            <div className="ct-hero-supporting-poster-card">
              <img
                src={getImageUrl(activeItem.poster_path, "w342") || ""}
                alt=""
                aria-hidden="true"
                width={342}
                height={513}
                loading="lazy"
                className="ct-hero-supporting-poster-image"
              />
              <div className="ct-hero-supporting-poster-label">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {t("home.topWatchedThisWeekKicker", "Weekly Spotlight")}
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-white">{activeTitle}</p>
              </div>
            </div>
          </div>
        ) : null}

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
                  "relative h-16 w-12 lg:h-20 lg:w-14 flex-shrink-0 overflow-hidden rounded-md border transition-[border-color,opacity,transform] duration-150 hover:-translate-y-0.5",
                  isActive
                    ? "border-primary opacity-100 z-10"
                    : "border-white/15 opacity-55 hover:opacity-90"
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
                aria-label={t("home.selectFeaturedTitle", "Select featured title: {{title}}", { title: getMediaTitle(item) })}
                aria-pressed={isActive}
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
        <h1 className="sr-only">{t("home.mobilePageTitle", "CineTrekker movie and TV tracker")}</h1>
        <div className="relative overflow-hidden bg-background">
          {/* Backdrop */}
          <div className="relative min-h-[54svh] sm:min-h-[60svh]">
            <img
              key={`hero-mob-bg-${activeItem.id}`}
              src={heroImage}
              alt=""
              aria-hidden="true"
              loading="eager"
              fetchPriority="high"
              className={cn(
                "absolute inset-0 h-full w-full object-cover object-center",
                !prefersReducedMotion && "animate-fade-in",
              )}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(247,37,37,0.14),transparent_36%),linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.4)_45%,rgba(8,8,10,0.94)_100%)]" />

            <div className="absolute inset-x-4 top-4 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
                {t("home.topWatchedThisWeekKicker", "Weekly Spotlight")}
              </span>
              <span className="text-[10px] font-medium text-white/65">{activeYear}</span>
            </div>

            <div className="absolute inset-x-4 bottom-3 flex gap-1">
              {topWeekly.map((item, i) => {
                const isActive = i === activeIndex;
                return (
                  <button
                    key={`mob-pb-${item.id}-${i}`}
                    type="button"
                    aria-label={t("home.selectFeaturedTitle", "Select featured title: {{title}}", { title: getMediaTitle(item) })}
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

        {/* Text content */}
        <div
          key={`hero-mob-content-${activeItem.id}`}
          className={cn("px-4 pb-4 pt-3", !prefersReducedMotion && "animate-slide-up")}
        >
            <div className="ct-hero-mobile-card rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="rounded-sm bg-foreground/10 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                    {activeItem.media_type === "tv" ? t("common.tvShow", "TV Show") : t("common.movie", "Movie")}
                  </span>
                  {activeYear && (
                    <span className="rounded-sm bg-foreground/10 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      {activeYear}
                    </span>
                  )}
                  {activeItem.vote_average > 0 && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {activeItem.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground" aria-hidden="true">
                  <Info className="h-4.5 w-4.5" />
                </div>
              </div>

              <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.03em] text-foreground">
                {activeTitle}
              </h2>

              <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                {t(
                  "home.heroValueProp",
                  "Track what you watch, save what is next, and discover your next favorite in one place.",
                )}
              </p>

              <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                <Button asChild className="h-11 rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
                  <Link to={activeMediaPath}>
                    <Info className="mr-2 h-4 w-4" />{t("common.details", "Details")}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-lg border-border/50 bg-foreground/5 text-foreground hover:bg-foreground/10"
                  onClick={() => { void (inWatchlist ? removeFromWatchlist(activeItem.id, activeMediaType) : addToWatchlist(activeItem.id, activeMediaType)); }}
                  aria-label={
                    inWatchlist
                      ? t("actions.removeFromWatchlistTitle", "Remove {{title}} from watchlist", { title: activeTitle })
                      : t("actions.addToWatchlistTitle", "Add {{title}} to watchlist", { title: activeTitle })
                  }
                >
                  <Bookmark className={cn("h-4 w-4", inWatchlist && "fill-current")} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn("h-11 w-11 rounded-lg border-border/50 bg-foreground/5 text-foreground hover:bg-foreground/10", inWatched && "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300")}
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
        </div>

        {activeItem.overview && (
            <div className="px-4 pb-2 pt-0.5">
              <p className="line-clamp-2 text-[12.5px] leading-5 text-muted-foreground">
                {activeItem.overview}
              </p>
          </div>
        )}
      </div>
      )}
    </section>
  );
}
