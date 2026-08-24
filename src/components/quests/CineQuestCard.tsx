import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Film, LockKeyhole } from "lucide-react";

import type { CineQuest } from "@/lib/cineQuests";
import { getQuestMonthKey } from "@/lib/cineQuests";
import { trackEngagementEvent } from "@/lib/engagement";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function CineQuestCard({
  quest,
  showAction = true,
}: {
  quest: CineQuest;
  showAction?: boolean;
}) {
  const { t } = useTranslation();
  const progress = Math.round((quest.progress / quest.target) * 100);

  useEffect(() => {
    if (!quest.completed || typeof window === "undefined") return;
    const storageKey = `cinetrekker_quest_completions_${getQuestMonthKey()}`;
    const completed = new Set(JSON.parse(window.localStorage.getItem(storageKey) || "[]") as string[]);
    if (completed.has(quest.id)) return;
    completed.add(quest.id);
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(completed)));
    trackEngagementEvent("quest_complete", { questId: quest.id, reward: quest.reward });
  }, [quest.completed, quest.id, quest.reward]);

  return (
    <article className={cn("relative overflow-hidden rounded-2xl border border-border/60 bg-background/40 p-5 transition-colors duration-200 hover:border-primary/30 hover:bg-background/55", quest.completed && "border-primary/25 bg-primary/[0.035]")}>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          {quest.completed ? <Check className="h-5 w-5" /> : <Film className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-foreground">{quest.title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{quest.description}</p>
            </div>
            {quest.completed ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Check className="h-3 w-3" />
                {t("quests.complete", "Complete")}
              </span>
            ) : (
              <LockKeyhole className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
            )}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>{quest.progress}/{quest.target}</span>
            <span className="text-foreground">{quest.reward}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/60">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.max(6, progress)}%` }} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">{quest.completed ? t("quests.rewardUnlocked", "Reward unlocked") : t("quests.keepGoing", "Keep going")}</span>
            {showAction ? (
              <Link to="/watched" className="inline-flex items-center gap-1 text-xs font-bold text-primary transition hover:text-primary/80">
                {t("quests.logActivity", "Log activity")}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
