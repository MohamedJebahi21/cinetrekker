import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CirclePlay,
  Clock3,
  ListChecks,
  Loader2,
  RefreshCw,
  Sparkles,
  Tv,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useUserLists } from "@/contexts/UserListsContext";
import { useContinueWatchingViewModel } from "@/hooks/useContinueWatchingViewModel";
import { useWatchedEpisodes } from "@/hooks/useFollowedShows";
import { useDailyReleases } from "@/hooks/useDailyReleases";
import { getImageUrl } from "@/services/tmdb";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/Image";
import { cn } from "@/lib/utils";
import type { ContinueWatchingVM } from "@/types/continueWatching";

function UpNextSkeleton() {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/15 bg-card/80 p-4 shadow-[0_22px_58px_rgba(0,0,0,0.16)] md:p-6">
      <div className="h-3 w-28 rounded skeleton-shimmer" />
      <div className="mt-3 h-8 w-56 rounded skeleton-shimmer" />
      <div className="mt-2 h-4 w-full max-w-xl rounded skeleton-shimmer" />
      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
        <div className="h-[238px] rounded-3xl skeleton-shimmer sm:h-[250px]" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="h-[112px] rounded-2xl skeleton-shimmer" />
          <div className="h-[112px] rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    </section>
  );
}

function episodeCode(item: ContinueWatchingVM) {
  if (item.nextEpisodeSeasonNumber == null || item.nextEpisodeNumber == null) return null;
  return `S${item.nextEpisodeSeasonNumber}E${item.nextEpisodeNumber}`;
}

export function UpNextCommandCenter() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { watchlist } = useUserLists();
  const continueWatching = useContinueWatchingViewModel();
  const { markEpisodeWatched, markingEpisodeTarget } = useWatchedEpisodes();
  const dailyReleases = useDailyReleases();

  if (!user) return null;

  if (continueWatching.isLoading || dailyReleases.isLoading) {
    return <UpNextSkeleton />;
  }

  const continuing = continueWatching.data ?? [];
  const readyToResume = continuing.find(
    (item) =>
      item.nextEpisodeSeasonNumber != null &&
      item.nextEpisodeNumber != null &&
      !item.nextEpisodeIsUpcoming,
  );
  const progressFocus = readyToResume ?? continuing[0] ?? null;
  const releaseFocus = dailyReleases.releases[0] ?? null;
  const primaryFocus = progressFocus ?? releaseFocus;

  const isProgressFocus = primaryFocus === progressFocus && progressFocus !== null;
  const isReadyEpisode =
    isProgressFocus &&
    progressFocus.nextEpisodeSeasonNumber != null &&
    progressFocus.nextEpisodeNumber != null &&
    !progressFocus.nextEpisodeIsUpcoming;
  const nextCode = progressFocus ? episodeCode(progressFocus) : null;
  const isMarkingPrimaryEpisode =
    isReadyEpisode &&
    markingEpisodeTarget?.showId === progressFocus.showId &&
    markingEpisodeTarget.seasonNumber === progressFocus.nextEpisodeSeasonNumber &&
    markingEpisodeTarget.episodeNumber === progressFocus.nextEpisodeNumber;

  const primaryHref = isProgressFocus
    ? progressFocus.href
    : releaseFocus
      ? `/${releaseFocus.mediaType === "tv" ? "tv" : "movie"}/${releaseFocus.id}`
      : "/discover";
  const primaryImage = isProgressFocus
    ? getImageUrl(progressFocus.posterPath, "w500")
    : releaseFocus
      ? getImageUrl(releaseFocus.posterPath, "w500")
      : "";

  const eyebrow = isProgressFocus
    ? isReadyEpisode
      ? t("home.upNextReasonEpisode", "Next released episode")
      : t("home.upNextReasonProgress", "Continue your series")
    : releaseFocus
      ? releaseFocus.source === "following"
        ? t("home.upNextReasonFollowRelease", "New today from a show you follow")
        : t("home.upNextReasonWatchlistRelease", "New today from your watchlist")
      : t("home.upNextReasonQueue", "Your next great watch starts here");

  const primaryTitle = isProgressFocus
    ? progressFocus.title
    : releaseFocus
      ? releaseFocus.title
      : t("home.upNextEmptyTitle", "Choose something worth watching");

  const primaryMeta = isProgressFocus
    ? nextCode
      ? `${nextCode}${progressFocus.nextEpisodeName ? ` · ${progressFocus.nextEpisodeName}` : ""}`
      : t("home.upNextProgressMeta", "Your progress is ready when you are.")
    : releaseFocus
      ? releaseFocus.mediaType === "tv" && releaseFocus.seasonNumber && releaseFocus.episodeNumber
        ? `S${releaseFocus.seasonNumber}E${releaseFocus.episodeNumber}${releaseFocus.episodeName ? ` · ${releaseFocus.episodeName}` : ""}`
        : t("home.upNextMovieRelease", "New movie release")
      : t("home.upNextEmptyMeta", "Search, save, and start building a personal queue.");

  const secondaryRelease =
    releaseFocus && (!isProgressFocus || releaseFocus.id !== progressFocus.showId)
      ? releaseFocus
      : null;

  return (
    <section
      className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-[radial-gradient(circle_at_88%_-18%,rgba(229,9,20,0.25),transparent_38%),linear-gradient(135deg,hsl(var(--card)/0.98),hsl(var(--background)/0.95))] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.2)] md:p-6"
      aria-labelledby="up-next-title"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/90">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t("home.upNextEyebrow", "Your next move")}
            </div>
            <h2 id="up-next-title" className="mt-1.5 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {t("home.upNextTitle", "Up Next")}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("home.upNextDescription", "One clear place to continue, catch a release, or choose what to watch tonight.")}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="min-h-10 shrink-0 border-primary/20 bg-background/55 hover:border-primary/45 hover:bg-primary/5">
            <Link to="/watched">
              {t("home.viewWatchingList", "View Watching List")}
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)] lg:gap-4">
          <article className="relative min-h-[238px] overflow-hidden rounded-3xl border border-white/10 bg-muted/40 sm:min-h-[250px]">
            {primaryImage ? (
              <Image
                src={primaryImage}
                alt=""
                width={500}
                height={750}
                className="absolute inset-0 h-full w-full object-cover opacity-65"
                loading="lazy"
                showSkeleton
              />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,12,14,0.98)_0%,rgba(12,12,14,0.88)_50%,rgba(12,12,14,0.35)_100%)]" />
            <div className="relative flex min-h-[238px] flex-col justify-between p-4 sm:min-h-[250px] sm:p-5">
              <div className="max-w-[80%] sm:max-w-[72%]">
                <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/12 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.15em] text-primary">
                  {isProgressFocus ? <CirclePlay className="h-3.5 w-3.5" aria-hidden="true" /> : <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />}
                  {eyebrow}
                </p>
                <h3 className="mt-3 line-clamp-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
                  <bdi dir="auto">{primaryTitle}</bdi>
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/72">{primaryMeta}</p>
                {isProgressFocus && progressFocus.progressPercent != null ? (
                  <p className="mt-2 text-xs font-semibold text-white/78">
                    {progressFocus.progressPercent}% {t("home.seriesProgress", "series progress")} · {t("home.episodesTracked", { count: progressFocus.watchedEpisodeCount, defaultValue: "{{count}} episodes tracked" })}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 pt-5">
                <Button asChild className="min-h-10 gap-2 shadow-[0_12px_28px_rgba(229,9,20,0.25)]">
                  <Link to={primaryHref}>
                    <CirclePlay className="h-4 w-4" />
                    {t("common.details", "Details")}
                  </Link>
                </Button>
                {isReadyEpisode ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10 gap-2 border-white/20 bg-black/35 text-white hover:border-primary/45 hover:bg-primary/15 hover:text-white"
                    disabled={isMarkingPrimaryEpisode}
                    onClick={() => {
                      markEpisodeWatched({
                        showId: progressFocus.showId,
                        seasonNumber: progressFocus.nextEpisodeSeasonNumber!,
                        episodeNumber: progressFocus.nextEpisodeNumber!,
                        episodeName: progressFocus.nextEpisodeName ?? undefined,
                        airDate: progressFocus.nextEpisodeAirDate ?? undefined,
                        showName: progressFocus.title,
                        posterPath: progressFocus.posterPath,
                      });
                    }}
                  >
                    {isMarkingPrimaryEpisode ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {t("home.markNextEpisode", "Mark Next Episode")}
                  </Button>
                ) : null}
              </div>
            </div>
          </article>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {secondaryRelease ? (
              <Link
                to={`/${secondaryRelease.mediaType === "tv" ? "tv" : "movie"}/${secondaryRelease.id}`}
                className="group flex min-h-[112px] gap-3 rounded-2xl border border-border/60 bg-background/45 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="h-[88px] w-14 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted">
                  <Image
                    src={getImageUrl(secondaryRelease.posterPath, "w154")}
                    alt=""
                    width={154}
                    height={231}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                    showSkeleton
                  />
                </div>
                <div className="min-w-0 py-0.5">
                  <p className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary/90">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("home.upNextAlsoToday", "Also today")}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-foreground transition-colors group-hover:text-primary">
                    {secondaryRelease.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {secondaryRelease.source === "following" ? t("home.dailyReleaseFollowing", "Following") : t("home.dailyReleaseWatchlist", "In your watchlist")}
                  </p>
                </div>
              </Link>
            ) : (
              <Link
                to={watchlist.length > 0 ? "/watchlist" : "/discover"}
                className="group flex min-h-[112px] items-center gap-3 rounded-2xl border border-border/60 bg-background/45 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <ListChecks className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary/90">
                    {watchlist.length > 0 ? t("home.upNextQueueEyebrow", "Your queue") : t("home.upNextDiscoverEyebrow", "Ready when you are")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground group-hover:text-primary">
                    {watchlist.length > 0
                      ? t("home.upNextQueueTitle", { count: watchlist.length, defaultValue: "{{count}} title waiting in your watchlist" })
                      : t("home.upNextDiscoverTitle", "Find something for tonight")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {watchlist.length > 0 ? t("home.upNextQueueBody", "Open your saved titles and choose your next watch.") : t("home.upNextDiscoverBody", "Build a queue and CineTrekker will keep it ready.")}
                  </p>
                </div>
              </Link>
            )}

            <Link
              to="/calendar"
              className={cn(
                "group flex min-h-[112px] items-center gap-3 rounded-2xl border p-3 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                dailyReleases.isError
                  ? "border-destructive/25 bg-destructive/5"
                  : "border-border/60 bg-background/35 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-background/60",
              )}
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/60 text-muted-foreground transition group-hover:border-primary/20 group-hover:bg-primary/10 group-hover:text-primary">
                {dailyReleases.isError ? <RefreshCw className="h-5 w-5" aria-hidden="true" /> : <Clock3 className="h-5 w-5" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("home.upNextRadarEyebrow", "Watch radar")}
                </p>
                <p className="mt-1 text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                  {dailyReleases.isError
                    ? t("home.upNextRadarErrorTitle", "Check your release calendar")
                    : dailyReleases.releaseCount > 0
                      ? t("home.upNextRadarCount", { count: dailyReleases.releaseCount, defaultValue: "{{count}} release today" })
                      : t("home.upNextRadarEmptyTitle", "Nothing new on your radar today")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dailyReleases.isError
                    ? t("home.upNextRadarErrorBody", "Your full calendar is still available.")
                    : t("home.upNextRadarBody", "Keep followed shows and saved titles in view.")}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
