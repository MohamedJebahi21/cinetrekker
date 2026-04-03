import { BarChart3, Bookmark, CheckCircle2, Tv } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { UserMediaItem } from "@/types/media";

type HomeStatsSnapshotProps = {
  watched: UserMediaItem[];
  watchlist: UserMediaItem[];
};

export function HomeStatsSnapshot({
  watched,
  watchlist,
}: HomeStatsSnapshotProps) {
  const { t } = useTranslation();
  const watchingCount = watched.filter((item) => item.status === "watching").length;
  const ratedCount = watched.filter((item) => typeof item.rating === "number").length;

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
      label: t("actions.rateTitle", "Rate"),
      value: ratedCount,
      icon: BarChart3,
    },
  ];

  return (
    <section className="ct-panel p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="section-title mb-1">{t("home.statsSnapshot", "Stats Snapshot")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("home.statsSnapshotDesc", "A quick view of how your library is taking shape.")}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/stats">{t("home.openFullStats", "Open Full Stats")}</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-border/60 bg-card/70 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
