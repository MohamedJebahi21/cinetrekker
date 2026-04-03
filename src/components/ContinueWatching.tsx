import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, CheckCircle2, Play, RefreshCw, Tv } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { getImageUrl, getMediaTitle } from "@/services/tmdb";
import { Image } from "@/components/ui/Image";
import { useWatchedEpisodes } from "@/hooks/useFollowedShows";
import { useAuth } from "@/contexts/AuthContext";
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [pageCount, setPageCount] = useState(1);

  const updateActiveIndex = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cards = Array.from(container.children) as HTMLElement[];
    if (cards.length === 0) return;

    const nextHasOverflow = container.scrollWidth > container.clientWidth + 4;
    const nextPageCount = nextHasOverflow
      ? Math.max(1, Math.ceil(container.scrollWidth / container.clientWidth))
      : 1;

    setHasOverflow(nextHasOverflow);
    setPageCount(nextPageCount);

    const scrollLeft = container.scrollLeft;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - container.offsetLeft - scrollLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActiveIndex(nearestIndex);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !data?.length) return;

    updateActiveIndex();

    const handleScroll = () => updateActiveIndex();
    const resizeObserver = new ResizeObserver(() => updateActiveIndex());

    container.addEventListener("scroll", handleScroll, { passive: true });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [data?.length]);

  const scrollToCard = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      left: container.clientWidth * index,
      behavior: "smooth",
    });
    setActiveIndex(index);
  };

  if (!user) return null;

  if (isLoading) {
    return <ContinueWatchingSkeleton />;
  }

  if (error instanceof Error) {
    return (
      <section className="ct-panel p-6 text-center">
        <h2 className="section-title mb-1">{t("home.continueWatching", "Continue Watching")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("home.continueWatchingLoadError", "We couldn't load your episode progress right now.")}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 gap-2"
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
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              <h2 className="section-title mb-0">{t("home.continueWatching", "Continue Watching")}</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "home.continueWatchingSubtitle",
                "Pick up the next released episode without hunting through your library.",
              )}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/watched">{t("home.viewWatchingList", "View Watching List")}</Link>
          </Button>
        </div>

        <div className="flex h-[320px] items-center justify-center rounded-3xl border border-dashed border-border/60 bg-background/30 p-6 text-center">
          <div className="max-w-md space-y-3">
            <Tv className="mx-auto h-10 w-10 text-primary" />
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

  return (
    <section className="ct-panel p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            <h2 className="section-title mb-0">{t("home.continueWatching", "Continue Watching")}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "home.continueWatchingSubtitle",
              "Pick up the next released episode without hunting through your library.",
            )}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/watched">{t("home.viewWatchingList", "View Watching List")}</Link>
        </Button>
      </div>

      <div
        ref={scrollContainerRef}
        className="hide-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 scroll-smooth overscroll-contain touch-pan-x"
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
              className="min-h-[430px] w-[min(86vw,320px)] shrink-0 snap-start overflow-hidden rounded-3xl border-border/60 bg-card/80 sm:min-h-[420px] sm:w-[320px] md:w-[360px]"
            >
              <CardContent className="p-0">
                <div className="flex h-full flex-col sm:flex-row">
                  <div className="aspect-[2/3] w-full overflow-hidden bg-muted/40 sm:aspect-auto sm:h-auto sm:w-32 md:w-36">
                    <Image
                      src={getImageUrl(item.details.poster_path, "w342")}
                      alt={title}
                      width={342}
                      height={513}
                      className="h-full w-full object-contain sm:object-cover"
                      loading="lazy"
                      showSkeleton
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="line-clamp-2 min-h-[3.5rem] text-base font-semibold text-foreground sm:text-lg">
                          <bdi dir="auto">{title}</bdi>
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("home.episodesTracked", {
                            count: item.watchedEpisodeCount,
                            defaultValue: "{{count}} episodes tracked",
                          })}
                        </p>
                      </div>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <Tv className="h-5 w-5" />
                      </span>
                    </div>

                    <div className="mt-4 min-h-[112px] rounded-2xl border border-border/60 bg-background/40 p-3">
                      {nextEpisode ? (
                        <>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {nextEpisode.isUpcoming
                              ? t("home.upNext", "Up next")
                              : t("home.nextEpisode", "Next episode")}
                          </p>
                          <p className="mt-1 line-clamp-2 font-medium text-foreground">
                            {nextEpisodeLabel} {nextEpisode.name}
                          </p>
                          {nextEpisode.air_date ? (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(nextEpisode.air_date).toLocaleDateString(
                                language,
                              )}
                            </p>
                          ) : null}
                        </>
                      ) : lastEpisode ? (
                        <>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {t("home.lastWatched", "Last watched")}
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            S{lastEpisode.season_number}E{lastEpisode.episode_number}
                          </p>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t("home.seriesProgress", "Series progress")}</span>
                        <span>{item.progressPercent}%</span>
                      </div>
                      <Progress value={item.progressPercent} className="h-2" />
                    </div>

                    <div className="mt-auto flex flex-col gap-2 pt-4">
                      <Button asChild className="flex-1 gap-2">
                        <Link to={`/tv/${item.details.id}`}>
                          <Play className="h-4 w-4" />
                          {t("home.openShow", "Open Show")}
                        </Link>
                      </Button>
                      {nextEpisode && !nextEpisode.isUpcoming ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() =>
                            markEpisodeWatched({
                              showId: item.details.id,
                              seasonNumber: nextEpisode.season_number,
                              episodeNumber: nextEpisode.episode_number,
                              episodeName: nextEpisode.name,
                              airDate: nextEpisode.air_date || undefined,
                              showName: title,
                              posterPath: item.details.poster_path,
                            })
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {t("home.markNextEpisode", "Mark Next Episode")}
                        </Button>
                      ) : (
                        <div className="h-10" aria-hidden="true" />
                      )}
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
              active={index === activeIndex}
              aria-label={t("home.goToContinueWatchingItem", {
                index: index + 1,
                defaultValue: "Go to continue watching item {{index}}",
              })}
              aria-pressed={index === activeIndex}
            />
          ))}
        </PaginationDots>
      ) : null}
    </section>
  );
}
