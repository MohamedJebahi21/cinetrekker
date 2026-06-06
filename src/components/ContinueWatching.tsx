import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, CheckCircle2, Play, RefreshCw, Tv } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { getImageUrl, getMediaTitle } from "@/services/tmdb";
import { cn } from "@/lib/utils";
import { Image } from "@/components/ui/Image";
import { useWatchedEpisodes } from "@/hooks/useFollowedShows";
import { useAuth } from "@/contexts/AuthContext";
import { safeT } from "@/lib/i18n";
import { PaginationDotButton, PaginationDots, PaginationDotStatic } from "@/components/ui/pagination-dots";

function ContinueWatchingSkeleton() {
  return (
    <section className="ct-panel p-5 md:p-6">
      <div className="mb-4 space-y-2">
        <div className="h-7 w-48 rounded-md skeleton-shimmer" />
        <div className="h-4 w-72 rounded-md skeleton-shimmer" />
      </div>
      <div className="hide-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-[430px] w-[min(86vw,320px)] shrink-0 rounded-3xl border border-border/60 bg-card/60 skeleton-shimmer sm:h-[420px] sm:w-[320px] md:w-[360px]"
          />
        ))}
      </div>
      <PaginationDots className="justify-center">
        {Array.from({ length: 3 }).map((_, index) => (
          <PaginationDotStatic key={index} active={index === 0} aria-hidden="true" />
        ))}
      </PaginationDots>
    </section>
  );
}

export function ContinueWatching() {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  const language = i18n.language;
  const { data, isLoading, error, refetch } = useContinueWatching(language);
  const { markEpisodeWatched } = useWatchedEpisodes();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [pageCount, setPageCount] = useState(1);

  const updateActiveIndex = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cards = Array.from(container.children) as HTMLElement[];
    if (cards.length === 0) return;

    const nextHasOverflow = container.scrollWidth > container.clientWidth + 4;
    const nextPageCount = nextHasOverflow
      ? Math.max(1, Math.ceil(container.scrollWidth / container.clientWidth))
      : 1;
    let nearestCardIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - container.scrollLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestCardIndex = index;
      }
    });

    const nextActivePage = nextHasOverflow && cards.length > 1
      ? Math.min(
          nextPageCount - 1,
          Math.round((nearestCardIndex / (cards.length - 1)) * (nextPageCount - 1)),
        )
      : 0;

    setHasOverflow(nextHasOverflow);
    setPageCount(nextPageCount);
    setActivePage(nextActivePage);
  }, []);

  const scheduleActiveIndexUpdate = useCallback(() => {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      updateActiveIndex();
    });
  }, [updateActiveIndex]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !data?.length) return;

    scheduleActiveIndexUpdate();

    const handleScroll = () => scheduleActiveIndexUpdate();
    const resizeObserver = new ResizeObserver(() => scheduleActiveIndexUpdate());

    container.addEventListener("scroll", handleScroll, { passive: true });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [data?.length, scheduleActiveIndexUpdate]);

  const scrollToCard = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cards = Array.from(container.children) as HTMLElement[];
    if (cards.length === 0) return;

    const nextPageCount = Math.max(1, Math.ceil(container.scrollWidth / container.clientWidth));
    const targetChildIndex =
      nextPageCount <= 1 || cards.length <= 1
        ? 0
        : Math.round((index * (cards.length - 1)) / (nextPageCount - 1));

    cards[targetChildIndex]?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  };

  if (!user) return null;

  if (isLoading) {
    return <ContinueWatchingSkeleton />;
  }

  if (error instanceof Error) {
    return (
      <section className="ct-panel p-6 text-center">
        <h2 className="section-title mb-1">{safeT(t, "home.continueWatching", "Continue Watching")}</h2>
        <p className="text-sm text-muted-foreground">
          {safeT(
            t,
            "home.continueWatchingLoadError",
            "We couldn't load your episode progress right now.",
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 gap-2 rounded-full border-white/10 bg-white/5"
          onClick={() => {
            void refetch();
          }}
        >
          <RefreshCw className="h-4 w-4" />
          {t("common.retry", "Retry")}
        </Button>
      </section>
    );
  }

  if (!data || data.length === 0) {
    return (
      <section className="ct-panel min-h-[420px] p-5 md:min-h-[460px] md:p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Play className="h-3.5 w-3.5 fill-current" />
              {t("home.continueWatchingBadge", "Active Queue")}
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">{safeT(t, "home.continueWatching", "Continue Watching")}</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">
              {safeT(
                t,
                "home.continueWatchingSubtitle",
                "Pick up the next released episode without hunting through your library.",
              )}
            </p>
          </div>
          <Button asChild variant="outline" className="h-10 rounded-full border-white/10 bg-white/5 px-5 text-sm font-medium text-white hover:bg-white/10">
            <Link to="/watched">{t("home.viewWatchingList", "View Watching List")}</Link>
          </Button>
        </div>

        <div className="flex h-[320px] items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)] p-6 text-center shadow-[inset_0_0_40px_rgba(0,0,0,0.2)]">
          <div className="max-w-md space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5 shadow-[0_0_20px_rgba(255,255,255,0.02)]">
              <Tv className="h-7 w-7 text-white/40" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-white">
              {t("home.continueWatchingEmptyTitle", "Nothing to continue yet")}
            </h3>
            <p className="text-sm leading-7 text-white/50">
              {t(
                "home.continueWatchingEmptyDesc",
                "Once you start a series, the next episode will appear here for fast access.",
              )}
            </p>
            <Button asChild className="btn-primary-glow mt-2 h-11 rounded-full px-6">
              <Link to="/search">{t("home.findShowToStart", "Find a show to start")}</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="ct-panel p-5 md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Play className="h-3.5 w-3.5 fill-current" />
            {t("home.continueWatchingBadge", "Active Queue")}
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">{safeT(t, "home.continueWatching", "Continue Watching")}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
            {safeT(
              t,
              "home.continueWatchingSubtitle",
              "Pick up the next released episode without hunting through your library.",
            )}
          </p>
        </div>
        <Button asChild variant="outline" className="h-10 rounded-full border-white/10 bg-white/5 px-5 text-sm font-medium text-white hover:bg-white/10">
          <Link to="/watched">{t("home.viewWatchingList", "View Watching List")}</Link>
        </Button>
      </div>

      <div
        ref={scrollContainerRef}
        className="hide-scrollbar -mx-1 flex snap-x snap-proximity gap-4 overflow-x-auto px-1 pb-4 overscroll-x-contain sm:gap-5 [scrollbar-width:none]"
      >
        {data.map((item) => {
          const title = getMediaTitle(item.details) || t("common.tvShow", "TV Show");
          const nextEpisode = item.nextEpisode;
          const lastEpisode = item.lastWatchedEpisode;
          const nextEpisodeLabel = nextEpisode
            ? `S${nextEpisode.season_number}E${nextEpisode.episode_number}`
            : null;

          return (
            <Card
              key={item.details.id}
              className="relative isolate min-h-[280px] w-[min(88vw,330px)] shrink-0 snap-start overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_100%)] shadow-[0_24px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl [content-visibility:auto] [contain-intrinsic-size:330px_320px] sm:min-h-[420px] sm:w-[350px] md:w-[410px]"
            >
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.04),transparent_60%)]" />
              <CardContent className="h-full p-2.5 sm:p-3">
                <div className="flex h-full gap-4 sm:gap-5">
                  <div className="relative w-[100px] shrink-0 self-start overflow-hidden rounded-[1.5rem] bg-black/40 sm:w-[130px] md:w-[150px]">
                    <Image
                      src={getImageUrl(item.details.poster_path, "w342")}
                      alt={title}
                      width={342}
                      height={513}
                      className="aspect-[2/3] h-auto w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                      loading="lazy"
                      showSkeleton
                    />
                  </div>

                  <div className="flex flex-1 flex-col py-1 pb-2 pr-1 sm:py-2 sm:pr-2">
                    {/* Title & Metadata */}
                    <div>
                      <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-white mb-2">
                        <bdi dir="auto">{title}</bdi>
                      </h3>
                      <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/70">
                        {t("home.episodesTracked", {
                          count: item.watchedEpisodeCount,
                          defaultValue: "{{count}} tracked",
                        })}
                      </div>
                    </div>

                    {/* Next Episode Widget */}
                    <div className="mt-4 rounded-[1.25rem] border border-white/5 bg-white/[0.02] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      {nextEpisode ? (
                        <>
                          <div className="mb-2 flex items-center gap-2">
                            <div className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              nextEpisode.isUpcoming ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                            )} />
                            <p className={cn(
                              "text-[10px] font-semibold uppercase tracking-[0.2em]",
                              nextEpisode.isUpcoming ? "text-amber-400/90" : "text-emerald-400/90"
                            )}>
                              {nextEpisode.isUpcoming
                                ? t("home.upNext", "Up next")
                                : t("home.readyToWatch", "Ready to watch")}
                            </p>
                          </div>
                          <p className="line-clamp-2 text-sm font-medium leading-relaxed text-white/90">
                            <span className="mr-1 text-white/50">{nextEpisodeLabel}</span>
                            {nextEpisode.name}
                          </p>
                          {nextEpisode.air_date ? (
                            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/40">
                              <Calendar className="h-3 w-3" />
                              {new Date(nextEpisode.air_date).toLocaleDateString(language)}
                            </p>
                          ) : null}
                        </>
                      ) : lastEpisode ? (
                        <>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-1">
                            {t("home.lastWatched", "Last watched")}
                          </p>
                          <p className="font-medium text-white/90">
                            S{lastEpisode.season_number}E{lastEpisode.episode_number}
                          </p>
                        </>
                      ) : null}
                    </div>

                    {/* Progress Segment */}
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-white/40">
                        <span>{t("home.seriesProgress", "Progress")}</span>
                        <span className="text-white/80">{item.progressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(217,4,41,0.5)] transition-all duration-1000 ease-out"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex flex-col gap-2.5 pt-6">
                      {nextEpisode && !nextEpisode.isUpcoming && (
                        <Button
                          type="button"
                          className="btn-primary-glow h-11 w-full rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markEpisodeWatched({
                              showId: item.details.id,
                              seasonNumber: nextEpisode.season_number,
                              episodeNumber: nextEpisode.episode_number,
                              episodeName: nextEpisode.name,
                              airDate: nextEpisode.air_date || undefined,
                              showName: title,
                              posterPath: item.details.poster_path,
                            });
                          }}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {t("home.markWatchedCompact", "Mark Watched")}
                        </Button>
                      )}
                      <Button
                        asChild
                        variant="outline"
                        className="h-11 w-full rounded-xl border-white/10 bg-white/[0.03] text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/10"
                      >
                        <Link to={`/tv/${item.details.id}`}>
                          {t("home.openShow", "Open Show")}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {hasOverflow && pageCount > 1 ? (
        <PaginationDots className="justify-center">
          {Array.from({ length: pageCount }).map((_, index) => (
            <PaginationDotButton
              key={`continue-watching-page-${index}`}
              onClick={() => scrollToCard(index)}
              active={index === activePage}
              aria-label={t("home.goToContinueWatchingItem", {
                index: index + 1,
                defaultValue: "Go to continue watching item {{index}}",
              })}
              aria-pressed={index === activePage}
            />
          ))}
        </PaginationDots>
      ) : null}
    </section>
  );
}
