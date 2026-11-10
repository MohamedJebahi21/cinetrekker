import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarCheck2, CalendarDays, Check } from "lucide-react";
import { Link } from "react-router-dom";

import { useEngagementLoop } from "@/hooks/useEngagementLoop";
import { trackEngagementEvent } from "@/lib/engagement";
import { cn } from "@/lib/utils";

const CHECKIN_EVENT_KEY = "cinetrekker_daily_checkin_event_day_v1";
const RANKS = [
  { threshold: 0, name: "Newcomer" },
  { threshold: 3, name: "Regular" },
  { threshold: 7, name: "Binge Builder" },
  { threshold: 14, name: "Screen Scholar" },
  { threshold: 30, name: "Cinematic Mainstay" },
  { threshold: 60, name: "CineTrekker Legend" },
] as const;

function getRank(streakDays: number) {
  return [...RANKS].reverse().find((rank) => streakDays >= rank.threshold) ?? RANKS[0];
}

function getNextRank(streakDays: number) {
  return RANKS.find((rank) => rank.threshold > streakDays) ?? null;
}

export function DailyCheckInCard() {
  const { t } = useTranslation();
  const { streakDays, checkedInToday, reminderTone } = useEngagementLoop();
  const [celebrated, setCelebrated] = useState(false);

  const rank = useMemo(() => getRank(streakDays), [streakDays]);
  const nextRank = useMemo(() => getNextRank(streakDays), [streakDays]);
  const daysToNextRank = nextRank ? Math.max(0, nextRank.threshold - streakDays) : 0;
  const progress = nextRank
    ? Math.min(100, Math.max(8, ((streakDays - rank.threshold) / (nextRank.threshold - rank.threshold)) * 100))
    : 100;

  useEffect(() => {
    if (!checkedInToday || typeof window === "undefined") return;

    const today = format(new Date(), "yyyy-MM-dd");
    if (window.localStorage.getItem(CHECKIN_EVENT_KEY) === today) return;

    window.localStorage.setItem(CHECKIN_EVENT_KEY, today);
    trackEngagementEvent("daily_checkin", {
      streakDays,
      rank: rank.name,
    });
    setCelebrated(true);
    const timeout = window.setTimeout(() => setCelebrated(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [checkedInToday, rank.name, streakDays]);

  const toneCopy =
    reminderTone === "comeback"
      ? t("home.checkInComeback", "Welcome back. Your watch rhythm is ready to restart.")
      : reminderTone === "streak"
        ? t("home.checkInStreak", "You are on a strong run. Keep the momentum alive today.")
        : t("home.checkInNudge", "A tiny check-in keeps your cinematic rhythm moving.");

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur-sm md:p-6"
      aria-labelledby="daily-check-in-title"
    >
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t("home.dailyCheckInEyebrow", "Daily check-in")}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="daily-check-in-title" className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {checkedInToday
                ? t("home.dailyCheckInCompleteTitle", "You are checked in")
                : t("home.dailyCheckInTitle", "Keep your watch streak alive")}
            </h2>
            {celebrated && (
              <span className="animate-fade-in rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                {t("home.dailyCheckInSaved", "Saved for today")}
              </span>
            )}
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{toneCopy}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-1.5">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1.5">
                  {t("home.currentStreak", "Current streak")}:
                </span>
                <span className="text-sm font-bold text-foreground">
                  {streakDays} {t("home.days", "days")}
                </span>
              </div>
            </div>
            <span className="rounded-xl border border-border/60 bg-background/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {t("home.rankLabel", "Rank")}: <span className="font-semibold text-foreground">{rank.name}</span>
            </span>
            <Link
              to="/watched"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t("home.logSomething", "Log something")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-muted-foreground">
              {nextRank ? t("home.nextRank", "Next rank") : t("home.maxRank", "Top rank")}:{" "}
              <strong className="text-foreground">{nextRank ? nextRank.name : rank.name}</strong>
            </span>
            <span className="text-[11px] text-muted-foreground">
              {nextRank
                ? t("home.daysToNextRank", "{{count}} days to go", { count: daysToNextRank })
                : t("home.topRankReached", "All ranks unlocked")}
            </span>
          </div>

          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1" aria-label={t("home.streakLastSeven", "Last seven days of streak")}>
            {Array.from({ length: 7 }, (_, index) => {
              const day = subDays(new Date(), 6 - index);
              const isFilled = checkedInToday && index >= Math.max(0, 7 - Math.min(streakDays, 7));
              return (
                <div key={format(day, "yyyy-MM-dd")} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-medium text-muted-foreground">{format(day, "EEE").slice(0, 1)}</span>
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-lg border text-[10px] font-semibold transition-colors",
                      isFilled
                        ? "border-primary/40 bg-primary text-primary-foreground"
                        : "border-border/50 bg-background/30 text-muted-foreground/80",
                    )}
                    title={format(day, "MMM d")}
                  >
                    {isFilled ? <Check className="h-3 w-3" aria-hidden="true" /> : format(day, "d")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
