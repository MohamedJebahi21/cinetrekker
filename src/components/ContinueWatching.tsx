import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock3, Play, RefreshCw, Tv } from "lucide-react";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { useUserLists } from "@/contexts/UserListsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Image } from "@/components/ui/Image";
import { getImageUrl, getMediaTitle } from "@/services/tmdb";

function ContinueWatchingSkeleton() {
  return (
    <section className="ct-panel p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded-md skeleton-shimmer" />
          <div className="h-7 w-64 rounded-md skeleton-shimmer" />
        </div>
        <div className="h-10 w-36 rounded-full skeleton-shimmer" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-[320px] w-[min(88vw,330px)] shrink-0 rounded-[2rem] border border-border/60 bg-card/50 skeleton-shimmer"
          />
        ))}
      </div>
    </section>
  );
}

export function ContinueWatching() {
  const { t, i18n } = useTranslation();
  const { user } = useUserLists();
  const language = i18n.language;
  const { data = [], isLoading, error, refetch } = useContinueWatching(language);

  if (!user) return null;

  if (isLoading) {
    return <ContinueWatchingSkeleton />;
  }

  if (error instanceof Error) {
    return (
      <section className="ct-panel p-6 text-center">
        <h2 className="section-title mb-1">{t("home.continueWatching", "Continue Watching")}</h2>
        <p className="text-sm text-muted-foreground">
          {t(
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

  if (data.length === 0) {
    return (
      <section className="ct-panel p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Play className="h-3.5 w-3.5 fill-current" />
              {t("home.continueWatchingBadge", "Active Queue")}
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {t("home.continueWatching", "Continue Watching")}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {t(
                "home.continueWatchingEmptyDesc",
                "Once you start a series, the next episode will appear here for fast access.",
              )}
            </p>
          </div>
          <Button asChild variant="outline" className="h-10 rounded-full border-border/60 px-5">
            <Link to="/watched">{t("home.viewWatchingList", "View Watching List")}</Link>
          </Button>
        </div>

        <div className="flex h-[220px] items-center justify-center rounded-[2rem] border border-dashed border-border/60 bg-card/40 p-6 text-center">
          <div className="max-w-md space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Tv className="h-7 w-7 text-primary/60" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              {t("home.continueWatchingEmptyTitle", "Nothing to continue yet")}
            </h3>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="ct-panel p-5 md:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Play className="h-3.5 w-3.5 fill-current" />
            {t("home.continueWatchingBadge", "Active Queue")}
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {t("home.continueWatching", "Continue Watching")}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t(
              "home.continueWatchingSubtitle",
              "Pick up the next released episode without hunting through your library.",
            )}
          </p>
        </div>
        <Button asChild variant="outline" className="h-10 rounded-full border-border/60 px-5">
          <Link to="/watched">{t("home.viewWatchingList", "View Watching List")}</Link>
        </Button>
      </div>

      <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-2">
        {data.map((item) => {
          const title = getMediaTitle(item.details) || t("common.tvShow", "TV Show");
          const poster = getImageUrl(item.details.poster_path, "w342");
          const nextEpisode = item.nextEpisode;

          return (
            <Card
              key={item.details.id}
              className="w-[min(88vw,340px)] shrink-0 overflow-hidden rounded-[2rem] border-border/60 bg-card/60"
            >
              <CardContent className="p-3">
                <div className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-background">
                  <div className="relative aspect-[2/3]">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={title}
                        width={342}
                        height={513}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted">
                        <Tv className="h-8 w-8 text-muted-foreground/60" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {t("home.continueWatchingBadge", "Active Queue")}
                        </p>
                        <h3 className="mt-1 truncate text-lg font-semibold text-foreground">
                          {title}
                        </h3>
                      </div>
                      {item.progressPercent > 0 ? (
                        <div className="rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-semibold text-foreground">
                          {item.progressPercent}%
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {item.lastWatchedEpisode ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {t(
                            "home.lastWatchedEpisode",
                            "Last watched S{{season}}E{{episode}}",
                            {
                              season: item.lastWatchedEpisode.season_number,
                              episode: item.lastWatchedEpisode.episode_number,
                            },
                          )}
                        </span>
                      ) : null}
                      {nextEpisode ? (
                        <span>
                          {t(
                            "home.nextEpisode",
                            "Next S{{season}}E{{episode}}",
                            {
                              season: nextEpisode.season_number,
                              episode: nextEpisode.episode_number,
                            },
                          )}
                        </span>
                      ) : null}
                    </div>

                    <Button asChild className="w-full rounded-2xl">
                      <Link to={`/tv/${item.details.id}`}>
                        {t("home.resumeWatching", "Resume Watching")}
                      </Link>
                    </Button>
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

export { ContinueWatchingSkeleton };
