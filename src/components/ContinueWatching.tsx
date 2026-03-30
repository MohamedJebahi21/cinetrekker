import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, CheckCircle2, Play, RefreshCw, Tv } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { getImageUrl } from "@/services/tmdb";
import { Image } from "@/components/ui/Image";
import { useWatchedEpisodes } from "@/hooks/useFollowedShows";
import { useAuth } from "@/contexts/AuthContext";

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
            className="h-[420px] w-[360px] shrink-0 rounded-3xl border border-border/60 bg-card/60 skeleton-shimmer"
          />
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <span
            key={index}
            className={`h-2.5 rounded-full ${
              index === 0 ? "w-8 bg-primary" : "w-2.5 bg-primary/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

export function ContinueWatching() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const language = i18n.language;
  const { data, isLoading, error, refetch } = useContinueWatching(language);
  const { markEpisodeWatched } = useWatchedEpisodes();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActiveIndex = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cards = Array.from(container.children) as HTMLElement[];
    if (cards.length === 0) return;

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
    const target = container?.children[index] as HTMLElement | undefined;
    if (!container || !target) return;

    container.scrollTo({
      left: target.offsetLeft - container.offsetLeft,
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
        <h2 className="section-title mb-1">Continue Watching</h2>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load your episode progress right now.
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
          Retry
        </Button>
      </section>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <section className="ct-panel p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            <h2 className="section-title mb-0">Continue Watching</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick up the next released episode without hunting through your library.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/watched">View Watching List</Link>
        </Button>
      </div>

      <div
        ref={scrollContainerRef}
        className="hide-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 scroll-smooth overscroll-contain touch-pan-x"
      >
        {data.map((item) => {
          const title = item.details.name || item.details.title || "TV Show";
          const nextEpisode = item.nextEpisode;
          const lastEpisode = item.lastWatchedEpisode;
          const nextEpisodeLabel = nextEpisode
            ? `S${nextEpisode.season_number}E${nextEpisode.episode_number}`
            : null;

          return (
            <Card
              key={item.details.id}
              className="h-[420px] w-[360px] shrink-0 snap-start overflow-hidden rounded-3xl border-border/60 bg-card/80"
            >
              <CardContent className="p-0">
                <div className="flex h-full flex-col md:flex-row">
                  <div className="h-48 w-full overflow-hidden bg-muted md:h-full md:w-36">
                    <Image
                      src={getImageUrl(item.details.poster_path, "w342")}
                      alt={title}
                      width={342}
                      height={513}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      showSkeleton
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-semibold text-foreground">
                          {title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.watchedEpisodeCount} episodes tracked
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
                            {nextEpisode.isUpcoming ? "Up next" : "Next episode"}
                          </p>
                          <p className="mt-1 font-medium text-foreground">
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
                            Last watched
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            S{lastEpisode.season_number}E{lastEpisode.episode_number}
                          </p>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Series progress</span>
                        <span>{item.progressPercent}%</span>
                      </div>
                      <Progress value={item.progressPercent} className="h-2" />
                    </div>

                    <div className="mt-auto flex flex-col gap-2 pt-4">
                      <Button asChild className="flex-1 gap-2">
                        <Link to={`/tv/${item.details.id}`}>
                          <Play className="h-4 w-4" />
                          Open Show
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
                          Mark Next Episode
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

      {data.length > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {data.map((item, index) => (
            <button
              key={item.details.id}
              type="button"
              onClick={() => scrollToCard(index)}
              className={`rounded-full transition-all ${
                index === activeIndex
                  ? "h-2.5 w-8 bg-primary"
                  : "h-2.5 w-2.5 bg-primary/30 hover:bg-primary/55"
              }`}
              aria-label={`Go to continue watching item ${index + 1}`}
              aria-pressed={index === activeIndex}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
