import { useTranslation } from "react-i18next";
import {
  BellRing,
  CalendarCheck2,
  ChevronRight,
  Film,
  RefreshCw,
  Tv,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useDailyReleases } from "@/hooks/useDailyReleases";
import { getImageUrl } from "@/services/tmdb";
import { cn } from "@/lib/utils";
import { Image } from "@/components/ui/Image";
import { Button } from "@/components/ui/button";

function DailyReleaseSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading today&apos;s releases">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="flex min-h-[104px] gap-3 rounded-2xl border border-border/50 bg-background/35 p-3"
        >
          <div className="h-20 w-14 shrink-0 rounded-xl skeleton-shimmer" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="h-3 w-20 rounded skeleton-shimmer" />
            <div className="h-4 w-4/5 rounded skeleton-shimmer" />
            <div className="h-3 w-2/3 rounded skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DailyReleaseHighlight() {
  const { t } = useTranslation();
  const {
    releases,
    releaseCount,
    hasCandidates,
    isLoading,
    isError,
    refetch,
  } = useDailyReleases();

  return (
    <section
      className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-[radial-gradient(circle_at_top_right,hsla(var(--primary)/0.18),transparent_44%),linear-gradient(135deg,hsla(var(--card)/0.98),hsla(var(--background)/0.92))] p-5 shadow-[0_20px_60px_hsl(var(--primary)/0.08)] md:p-6"
      aria-labelledby="daily-release-highlight-title"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/90">
              <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
              {t("home.dailyReleaseEyebrow", "Your watch radar")}
            </div>
            <h2
              id="daily-release-highlight-title"
              className="text-xl font-bold tracking-tight text-foreground md:text-2xl"
            >
              {releaseCount > 0
                ? t("home.dailyReleaseTitleWithCount", {
                    count: releaseCount,
                    defaultValue: `${releaseCount} release${releaseCount === 1 ? "" : "s"} for you today`,
                  })
                : t("home.dailyReleaseTitleEmpty", "Anything new on your radar today?")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {releaseCount > 0
                ? t(
                    "home.dailyReleaseDescriptionWithCount",
                    "New episodes and releases from titles you follow or saved are gathered here first.",
                  )
                : hasCandidates
                  ? t(
                      "home.dailyReleaseDescriptionEmpty",
                      "Nothing from your current radar is releasing today. The calendar has the full release timeline.",
                    )
                  : t(
                      "home.dailyReleaseDescriptionNoRadar",
                      "Follow a series or save upcoming titles and CineTrekker will surface their release days here.",
                    )}
            </p>
          </div>
          <Link
            to="/calendar"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/45 px-4 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-background/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t("home.openCalendar", "Open calendar")}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {isLoading ? (
          <DailyReleaseSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("home.dailyReleaseErrorTitle", "Your watch radar needs a refresh")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("home.dailyReleaseErrorDescription", "We could not check today&apos;s releases right now.")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="min-h-10 gap-2 rounded-xl bg-background/45"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("common.retry", "Try again")}
            </Button>
          </div>
        ) : releases.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {releases.slice(0, 3).map((release) => {
              const isTv = release.mediaType === "tv";
              const href = `/${isTv ? "tv" : "movie"}/${release.id}`;
              const TypeIcon = isTv ? Tv : Film;
              const dateLabel = isTv && release.seasonNumber && release.episodeNumber
                ? `S${release.seasonNumber} E${release.episodeNumber}`
                : t("home.dailyReleaseMovieLabel", "Movie release");

              return (
                <Link
                  key={`${release.mediaType}-${release.id}`}
                  to={href}
                  className="group flex min-h-[104px] gap-3 rounded-2xl border border-border/60 bg-background/35 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted">
                    <Image
                      src={getImageUrl(release.posterPath, "w154")}
                      alt=""
                      width={154}
                      height={231}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                      showSkeleton
                    />
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary/85">
                      <TypeIcon className="h-3 w-3" aria-hidden="true" />
                      <span>{dateLabel}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-foreground transition-colors group-hover:text-primary">
                      {release.title}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <BellRing className="h-3 w-3" aria-hidden="true" />
                      <span>
                        {release.source === "following"
                          ? t("home.dailyReleaseFollowing", "Following")
                          : t("home.dailyReleaseWatchlist", "In your watchlist")}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <BellRing className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {hasCandidates
                    ? t("home.dailyReleaseEmptyTitle", "No releases today")
                    : t("home.dailyReleaseNoRadarTitle", "Build your watch radar")}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {hasCandidates
                    ? t("home.dailyReleaseEmptyBody", "Check back tomorrow or browse the full calendar for what is next.")
                    : t("home.dailyReleaseNoRadarBody", "Follow your favorite shows to get a focused release update here.")}
                </p>
              </div>
            </div>
            <Link
              to={hasCandidates ? "/calendar" : "/discover"}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                hasCandidates
                  ? "border border-border/60 bg-background/45 text-foreground hover:border-primary/30 hover:text-primary"
                  : "bg-primary text-primary-foreground shadow-[0_12px_28px_hsl(var(--primary)/0.2)] hover:bg-primary/90",
              )}
            >
              {hasCandidates
                ? t("home.viewFullCalendar", "View calendar")
                : t("home.findTitlesToFollow", "Find titles to follow")}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        {releases.length > 3 ? (
          <div className="mt-4 text-right">
            <Link
              to="/calendar"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:text-primary/80"
            >
              {t("home.viewAllDailyReleases", "View all releases")}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
