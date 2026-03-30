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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-52 rounded-3xl border border-border/60 bg-card/60 skeleton-shimmer"
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              className="overflow-hidden rounded-3xl border-border/60 bg-card/80"
            >
              <CardContent className="p-0">
                <div className="flex h-full flex-col md:flex-row">
                  <div className="aspect-[2/3] w-full overflow-hidden bg-muted md:w-36">
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
                        <h3 className="text-lg font-semibold text-foreground">
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

                    <div className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-3">
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

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
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
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
