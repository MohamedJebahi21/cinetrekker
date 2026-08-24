import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarCheck2, CalendarDays, Check, LockKeyhole } from "lucide-react";
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
      className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-[radial-gradient(circle_at_top_right,hsla(var(--primary)/0.16),transparent_42%),linear-gradient(135deg,hsla(var(--card)/0.98),hsla(var(--background)/0.94))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] md:p-6"
      aria-labelledby="daily-check-in-title"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-primary/8 blur-3xl" />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
            {t("home.dailyCheckInEyebrow", "Daily check-in")}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="daily-check-in-title" className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {checkedInToday
                ? t("home.dailyCheckInCompleteTitle", "You are checked in")
                : t("home.dailyCheckInTitle", "Keep your watch streak alive")}
            </h2>
            {celebrated && (
              <span className="animate-fade-in rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                {t("home.dailyCheckInSaved", "Saved for today")}
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{toneCopy}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/[0.055] px-3 py-2">
              <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
                  {t("home.currentStreak", "Current streak")}
                </p>
                <p className="text-lg font-black leading-none text-foreground">
                  {streakDays} {t("home.days", "days")}
                </p>
              </div>
            </div>
            <span className="rounded-full border border-border/60 bg-background/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
              {t("home.rankLabel", "Rank")}: <span className="text-foreground">{rank.name}</span>
            </span>
            <Link
              to="/watched"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_hsl(var(--primary)/0.18)] transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t("home.logSomething", "Log something")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/15 bg-background/45 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {nextRank ? t("home.nextRank", "Next rank") : t("home.maxRank", "Top rank")}
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">
                {nextRank ? nextRank.name : rank.name}
              </p>
            </div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              {nextRank ? <LockKeyhole className="h-5 w-5" aria-hidden="true" /> : <Check className="h-5 w-5" aria-hidden="true" />}
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{streakDays} {t("home.days", "days")}</span>
            <span>
              {nextRank
                ? t("home.daysToNextRank", "{{count}} days to go", { count: daysToNextRank })
                : t("home.topRankReached", "All ranks unlocked")}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label={t("home.streakLastSeven", "Last seven days of streak") }>
            {Array.from({ length: 7 }, (_, index) => {
              const day = subDays(new Date(), 6 - index);
              const isFilled = checkedInToday && index >= Math.max(0, 7 - Math.min(streakDays, 7));
              return (
                <div key={format(day, "yyyy-MM-dd")} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-semibold text-muted-foreground">{format(day, "EEE").slice(0, 1)}</span>
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold",
                      isFilled
                        ? "border-primary/40 bg-primary text-primary-foreground"
                        : "border-border/60 bg-background/40 text-muted-foreground",
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
