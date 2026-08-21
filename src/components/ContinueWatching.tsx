/**
 * ContinueWatching — pure presentational component.
 *
 * No business logic, no TMDB calls, no episode resolution logic.
 * Receives precomputed ContinueWatchingVM[] from the orchestrator hook.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, CheckCircle2, Clock3, Loader2, Play, RefreshCw, Sparkles, Tv } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useContinueWatchingViewModel } from "@/hooks/useContinueWatchingViewModel";
import { useContinueWatchingCardEnrichment } from "@/hooks/useContinueWatchingCardEnrichment";
import { useWatchedEpisodes, type WatchedEpisode } from "@/hooks/useFollowedShows";
import type { ContinueWatchingVM } from "@/types/continueWatching";
import { useAuth } from "@/contexts/AuthContext";
import { Image } from "@/components/ui/Image";
import { safeT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PaginationDotButton, PaginationDots } from "@/components/ui/pagination-dots";

function formatEpisodeCode(seasonNumber: number, episodeNumber: number) {
  return `S${seasonNumber}E${episodeNumber}`;
}

function ContinueWatchingSkeleton() {
  return (
    <section className="ct-panel p-4 md:p-6">
      <div className="mb-4 space-y-2">
        <div className="h-7 w-48 rounded-md skeleton-shimmer" />
        <div className="h-4 w-72 rounded-md skeleton-shimmer" />
      </div>
      <div className="hide-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-[420px] w-[calc(50vw-1.5rem)] shrink-0 rounded-[1.5rem] border border-border/60 bg-card/60 skeleton-shimmer sm:w-[180px] md:w-[200px] lg:w-[220px] xl:w-[240px]"
          />
        ))}
      </div>
      <PaginationDots className="justify-center">
        {Array.from({ length: 3 }).map((_, index) => (
          <PaginationDotButton
            key={`skeleton-dot-${index}`}
            onClick={() => {}}
            active={index === 0}
            aria-hidden="true"
          />
        ))}
      </PaginationDots>
    </section>
  );
}

function ContinueWatchingCard({
  item,
  watchedEpisodes,
  markingEpisodeTarget,
  onMarkEpisode,
}: {
  item: ContinueWatchingVM;
  watchedEpisodes: WatchedEpisode[];
  markingEpisodeTarget: {
    showId: number;
    seasonNumber: number;
    episodeNumber: number;
  } | null;
  onMarkEpisode: (input: {
    showId: number;
    seasonNumber: number;
    episodeNumber: number;
    episodeName?: string;
    airDate?: string;
    showName?: string;
    posterPath?: string | null;
  }) => void;
}) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = cardRef.current;
    if (!element || !item.needsSeasonEnrichment) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { rootMargin: "120px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [item.needsSeasonEnrichment]);

  const enrichment = useContinueWatchingCardEnrichment(item, watchedEpisodes, inView);
  const display = enrichment.data ?? item;

  const nextEpisodeLabel = display.nextEpisodeLabel ?? null;
  const hasNextEpisode =
    display.nextEpisodeSeasonNumber != null &&
    display.nextEpisodeNumber != null &&
    !display.nextEpisodeIsUpcoming;
  const nextEpisodeCode = hasNextEpisode
    ? formatEpisodeCode(display.nextEpisodeSeasonNumber!, display.nextEpisodeNumber!)
    : nextEpisodeLabel;

  const isMarkingThisEpisode =
    markingEpisodeTarget?.showId === display.showId &&
    markingEpisodeTarget.seasonNumber === display.nextEpisodeSeasonNumber &&
    markingEpisodeTarget.episodeNumber === display.nextEpisodeNumber;

  return (
    <Card
      ref={cardRef}
      className="group w-[calc(50vw-1.5rem)] shrink-0 snap-start overflow-hidden rounded-xl border-border/70 bg-card/95 shadow-[0_18px_46px_rgba(0,0,0,0.2)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/55 hover:shadow-[0_24px_62px_rgba(229,9,20,0.18)] sm:w-[180px] md:w-[200px] lg:w-[220px] xl:w-[240px]"
    >
      <CardContent className="p-0">
        <div className="flex h-full flex-col">
          <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted/40">
            <Image
              src={display.posterPath ? `https://image.tmdb.org/t/p/w500${display.posterPath}` : ""}
              alt={display.title}
              width={500}
              height={750}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.055]"
              loading="lazy"
              showSkeleton
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-background/15 to-transparent" />
            <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              {t("home.continueWatchingEyebrow", "In progress")}
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
              <span className="rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                {t("home.episodesTracked", {
                  count: display.watchedEpisodeCount,
                  defaultValue: "{{count}} episodes tracked",
                })}
              </span>
              {display.progressPercent != null ? (
                <span className="rounded-full border border-primary/25 bg-primary/90 px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-lg">
                  {display.progressPercent}%
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primary/90">
                  {hasNextEpisode
                    ? t("home.nextEpisode", "Next episode")
                    : t("home.continueWatchingEyebrow", "In progress")}
                </p>
                <h3 className="mt-1 line-clamp-2 text-base font-bold leading-tight text-foreground">
                  <bdi dir="auto">{display.title}</bdi>
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
                  {display.releasedEpisodeCount != null
                    ? `${display.watchedEpisodeCount} / ${display.releasedEpisodeCount} ${t("home.releasedEpisodes", "released episodes")}`
                    : t("home.episodesTracked", {
                        count: display.watchedEpisodeCount,
                        defaultValue: "{{count}} episodes tracked",
                      })}
                </p>
              </div>
              <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-[0_10px_24px_rgba(229,9,20,0.12)] lg:inline-flex">
                <Tv className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>

            <div className="relative mt-3 min-h-[92px] overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-background/85 to-muted/30 p-3 before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-r-full before:bg-primary">
              {enrichment.isFetching && item.needsSeasonEnrichment ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("home.loadingNextEpisode", "Loading next episode...")}
                </div>
              ) : nextEpisodeCode ? (
                <>
                  <p className="pl-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {hasNextEpisode
                      ? t("home.nextEpisode", "Next episode")
                      : t("home.upNext", "Up next")}
                  </p>
                  <p className="mt-1.5 line-clamp-2 pl-1 text-sm font-semibold leading-snug text-foreground">
                    <span className="mr-1.5 inline-flex rounded-md bg-primary/12 px-1.5 py-0.5 text-xs font-bold text-primary">
                      {nextEpisodeCode}
                    </span>
                    {display.nextEpisodeName}
                  </p>
                  {display.nextEpisodeAirDate ? (
                    <p className="mt-2 flex items-center gap-1 pl-1 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(display.nextEpisodeAirDate).toLocaleDateString()}
                    </p>
                  ) : null}
                </>
              ) : display.lastWatchedEpisode ? (
                <>
                  <p className="pl-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("home.lastWatched", "Last watched")}
                  </p>
                  <p className="mt-1.5 pl-1 font-semibold text-foreground">
                    S{display.lastWatchedEpisode.season}E{display.lastWatchedEpisode.episode}
                  </p>
                </>
              ) : (
                <p className="pl-1 text-sm text-muted-foreground">
                  {t("home.episodeActivityPreserved", "Your watched episodes are saved and ready when the next episode is available.")}
                </p>
              )}
            </div>

            <div className="mt-3 rounded-xl border border-border/60 bg-background/35 px-3 py-2">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="font-medium">{t("home.seriesProgress", "Series progress")}</span>
                {display.progressPercent != null ? (
                  <span className="font-semibold text-foreground">{display.progressPercent}%</span>
                ) : (
                  <span>{t("home.progressSyncing", "Episodes saved")}</span>
                )}
              </div>
              {display.progressPercent != null ? (
                <Progress value={display.progressPercent} className="mt-2 h-2 bg-muted/70 [&>div]:bg-primary" />
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t("home.progressMetadataPending", "Progress will appear after the released episode total is confirmed.")}
                </p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/50 pt-3">
              <Button
                asChild
                className={cn(
                  "h-9 gap-1.5 text-xs font-semibold shadow-[0_10px_22px_rgba(229,9,20,0.16)]",
                  hasNextEpisode ? "col-span-1" : "col-span-2",
                )}
              >
                <Link to={display.href}>
                  <Play className="h-4 w-4" />
                  {t("common.details", "Details")}
                </Link>
              </Button>
              {hasNextEpisode ? (
                <Button
                  type="button"
                  variant="outline"
                  className="col-span-1 h-9 gap-1.5 border-primary/20 bg-background/50 text-xs font-semibold hover:border-primary/45 hover:bg-primary/5"
                  disabled={isMarkingThisEpisode}
                  onClick={() => {
                    onMarkEpisode({
                      showId: display.showId,
                      seasonNumber: display.nextEpisodeSeasonNumber!,
                      episodeNumber: display.nextEpisodeNumber!,
                      episodeName: display.nextEpisodeName ?? undefined,
                      airDate: display.nextEpisodeAirDate ?? undefined,
                      showName: display.title,
                      posterPath: display.posterPath,
                    });
                  }}
                >
                  {isMarkingThisEpisode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {t("home.markNextEpisode", "Mark Next Episode")}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ContinueWatching() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useContinueWatchingViewModel();
  const { markEpisodeWatched, markingEpisodeTarget, watchedEpisodes } = useWatchedEpisodes();
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

    setHasOverflow(nextHasOverflow);
    setPageCount(nextPageCount);
    setActivePage(
      nextHasOverflow && cards.length > 1
        ? Math.min(
            nextPageCount - 1,
            Math.round((nearestCardIndex / (cards.length - 1)) * (nextPageCount - 1)),
          )
        : 0,
    );
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
          className="mt-4 gap-2"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4" />
          {t("common.retry", "Retry")}
        </Button>
      </section>
    );
  }

  if (!data || data.length === 0) {
    return (
      <section className="ct-panel relative min-h-[380px] overflow-hidden border-primary/15 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.12),transparent_34%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--background)))] p-4 md:min-h-[460px] md:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              <h2 className="section-title mb-0">{safeT(t, "home.continueWatching", "Continue Watching")}</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {safeT(
                t,
                "home.continueWatchingSubtitle",
                "Pick up the next released episode without hunting through your library.",
              )}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/watched">{t("home.viewWatchingList", "View Watching List")}</Link>
          </Button>
        </div>

        <div className="flex h-[320px] items-center justify-center rounded-3xl border border-dashed border-primary/25 bg-background/45 p-6 text-center shadow-inner">
          <div className="max-w-md space-y-3">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_12px_30px_rgba(229,9,20,0.12)]">
              <Tv className="h-7 w-7" />
            </span>
            <h3 className="text-lg font-semibold text-foreground">
              {t("home.continueWatchingEmptyTitle", "Nothing to continue yet")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(
                "home.continueWatchingEmptyDesc",
                "Once you start a series, the next episode will appear here for fast access.",
              )}
            </p>
            <Button asChild className="btn-primary-glow mt-2">
              <Link to="/search">{t("home.findShowToStart", "Find a show to start")}</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const readyToResumeCount = data.filter(
    (item) =>
      item.nextEpisodeSeasonNumber != null &&
      item.nextEpisodeNumber != null &&
      !item.nextEpisodeIsUpcoming,
  ).length;
  const upcomingEpisodeCount = data.filter(
    (item) => item.nextEpisodeIsUpcoming,
  ).length;

  return (
    <section className="ct-panel relative overflow-hidden border-primary/15 bg-[radial-gradient(circle_at_100%_0%,rgba(229,9,20,0.15),transparent_28%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--background)))] p-4 md:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="relative mb-5 flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            <h2 className="section-title mb-0">{safeT(t, "home.continueWatching", "Continue Watching")}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {safeT(
              t,
              "home.continueWatchingSubtitle",
              "Pick up the next released episode without hunting through your library.",
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2" aria-label={t("home.continueWatchingSummary", "Your continue watching summary")}>
            {readyToResumeCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {t("home.readyToResume", {
                  count: readyToResumeCount,
                  defaultValue: "{{count}} ready to resume",
                })}
              </span>
            ) : null}
            {upcomingEpisodeCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/45 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                {t("home.upcomingEpisodeCount", {
                  count: upcomingEpisodeCount,
                  defaultValue: "{{count}} upcoming",
                })}
              </span>
            ) : null}
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="relative min-h-10 border-primary/20 bg-background/55 hover:border-primary/45 hover:bg-primary/5">
          <Link to="/watched">{t("home.viewWatchingList", "View Watching List")}</Link>
        </Button>
      </div>

      <div
        ref={scrollContainerRef}
        className="hide-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-4 overscroll-x-contain [scrollbar-width:none]"
      >
        {data.map((item) => (
          <ContinueWatchingCard
            key={item.showId}
            item={item}
            watchedEpisodes={watchedEpisodes}
            markingEpisodeTarget={markingEpisodeTarget}
            onMarkEpisode={markEpisodeWatched}
          />
        ))}
      </div>

      {hasOverflow && pageCount > 1 ? (
        <PaginationDots className="mt-2 justify-center gap-1">
          {Array.from({ length: pageCount }).map((_, index) => (
            <PaginationDotButton
              key={`continue-watching-page-${index}`}
              onClick={() => scrollToCard(index)}
              active={index === activePage}
              aria-label={t("home.goToContinueWatchingItem", {
                index: index + 1,
                defaultValue: "Go to continue watching item {{index}}",
              })}
            />
          ))}
        </PaginationDots>
      ) : null}
    </section>
  );
}
