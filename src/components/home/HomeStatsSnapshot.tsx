import { BarChart3, Bookmark, CheckCircle2, Tv } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { UserMediaItem } from "@/types/media";
import { useEngagementLoop } from "@/hooks/useEngagementLoop";

type HomeStatsSnapshotProps = {
  watched: UserMediaItem[];
  watchlist: UserMediaItem[];
  ctaHref?: string;
  ctaLabel?: string;
};

export function HomeStatsSnapshot({
  watched,
  watchlist,
  ctaHref = "/stats",
  ctaLabel,
}: HomeStatsSnapshotProps) {
  const { t } = useTranslation();
  const { streakDays } = useEngagementLoop();
  const watchingCount = watched.filter((item) => item.status === "watching").length;

  const stats = [
    {
      label: t("nav.watched", "Watched"),
      value: watched.length,
      icon: CheckCircle2,
    },
    {
      label: t("nav.watchlist", "Watchlist"),
      value: watchlist.length,
      icon: Bookmark,
    },
    {
      label: t("status.watching", "Watching"),
      value: watchingCount,
      icon: Tv,
    },
    {
      label: t("home.streak", "Streak"),
      value: Math.max(1, streakDays || 0),
      icon: BarChart3,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur-sm md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            {t("home.librarySnapshot", "Library Snapshot")}
          </p>
          <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {t("home.statsSnapshot", "Stats Snapshot")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("home.statsSnapshotDesc", "A quick view of how your library is taking shape.")}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-9 rounded-xl border-border/60 text-xs font-semibold">
          <Link to={ctaHref}>{ctaLabel || t("home.openFullStats", "Open Full Stats")}</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-border hover:bg-background/60"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                    {stat.value}
                  </p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
