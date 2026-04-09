import { Clock3, Flame, History, Tv } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { UserMediaItem } from "@/types/media";
import { useLastViewed } from "@/hooks/useLastViewed";
import { useEngagementLoop } from "@/hooks/useEngagementLoop";

type ReturnSignalsSectionProps = {
  watched: UserMediaItem[];
  watchlist: UserMediaItem[];
};

export function ReturnSignalsSection({
  watched,
  watchlist,
}: ReturnSignalsSectionProps) {
  const { t } = useTranslation();
  const { lastViewedList } = useLastViewed();
  const { streakDays, comebackDays } = useEngagementLoop();

  const watchingCount = watched.filter((item) => item.status === "watching").length;
  const recentlyAddedCount = watchlist.filter((item) => {
    if (!item.addedAt) return false;
    const addedAt = new Date(item.addedAt).getTime();
    return Date.now() - addedAt < 1000 * 60 * 60 * 24 * 7;
  }).length;

  const signals = [
    {
      title: t("home.keepMomentum", "Keep your momentum"),
      value: t("home.currentlyWatchingCount", "{{count}} titles in progress", {
        count: watchingCount,
      }),
      href: "/watched",
      icon: Tv,
    },
    {
      title: t("home.queueFreshness", "Queue freshness"),
      value: t("home.recentlySavedCount", "{{count}} titles added this week", {
        count: recentlyAddedCount,
      }),
      href: "/watchlist",
      icon: Flame,
    },
    {
      title: t("home.comebackPrompt", "Pick up where you left off"),
      value:
        lastViewedList[0]?.title ||
        t("home.comebackPromptFallback", "Your recently viewed titles will appear here."),
      href: "/search",
      icon: History,
    },
    {
      title: t("home.browseTonight", "Find something for tonight"),
      value:
        comebackDays > 0
          ? t("home.comebackDaysHint", "You came back after {{days}} days. Start with one easy win.", {
              days: comebackDays,
            })
          : t("home.streakDaysHint", "Current streak: {{count}} days. Keep it moving.", {
              count: Math.max(1, streakDays),
            }),
      href: comebackDays > 0 ? "/watchlist" : "/discover",
      icon: comebackDays > 0 ? History : Clock3,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {signals.map((signal) => {
        const Icon = signal.icon;
        return (
          <Link
            key={signal.title}
            to={signal.href}
            className="ct-panel group flex min-h-[9rem] flex-col justify-between p-4 transition-transform duration-200 hover:-translate-y-1"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                {signal.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {signal.value}
              </p>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
