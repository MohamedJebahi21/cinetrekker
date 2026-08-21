import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarDays, ChevronRight, Trophy } from "lucide-react";

import { useUserLists } from "@/contexts/UserListsContext";
import { buildMonthlyCineQuests, getQuestMonthLabel } from "@/lib/cineQuests";
import { CineQuestCard } from "@/components/quests/CineQuestCard";

export function CineQuestHub({
  limit,
  showStarterExperience = false,
}: {
  limit?: number;
  showStarterExperience?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { watched, watchlist, loading: userListsLoading } = useUserLists();
  const [showFullBoard, setShowFullBoard] = useState(false);
  const quests = useMemo(() => buildMonthlyCineQuests(watched, watchlist), [watched, watchlist]);
  const visibleQuests = typeof limit === "number" ? quests.slice(0, limit) : quests;
  const completedCount = quests.filter((quest) => quest.completed).length;
  const isStarterState =
    showStarterExperience &&
    !userListsLoading &&
    watched.length === 0 &&
    watchlist.length === 0 &&
    completedCount === 0;
  const isStarterPreview = isStarterState && !showFullBoard;
  const displayedQuests = isStarterPreview ? quests.slice(0, 3) : visibleQuests;

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-[radial-gradient(circle_at_top_right,hsla(var(--primary)/0.16),transparent_42%),linear-gradient(135deg,hsla(var(--card)/0.98),hsla(var(--background)/0.94))] p-5 md:p-6" aria-labelledby="cine-quests-title">
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 h-52 w-52 rounded-full bg-primary/8 blur-3xl" />
      <div className="relative">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              {t("quests.eyebrow", "Monthly quests")}
            </div>
            <h2 id="cine-quests-title" className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {t("quests.title", "Your cinematic missions")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {getQuestMonthLabel(new Date(), i18n.language)} · {t("quests.progressSummary", "{{completed}} of {{total}} complete", { completed: completedCount, total: quests.length })}
            </p>
          </div>
          {isStarterPreview ? (
            <button
              type="button"
              onClick={() => setShowFullBoard(true)}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/35 px-3.5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t("quests.viewAll", "View all quests")}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <Link to="/quests" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/35 px-3.5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {t("quests.viewAll", "View all quests")}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        {isStarterPreview ? (
          <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                {t("profile.startYourWeek", "Start your next watch")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("quests.starterHint", "Log a title to begin your first mission and unlock the full monthly board.")}
              </p>
            </div>
            <Link
              to="/discover"
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t("watched.discoverTitles", "Discover titles")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
        <div className="grid gap-3 lg:grid-cols-2">
          {displayedQuests.map((quest) => (
            <CineQuestCard key={quest.id} quest={quest} showAction={!isStarterPreview} />
          ))}
        </div>
      </div>
    </section>
  );
}
