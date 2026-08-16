import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, Film, Flame, LockKeyhole, Sparkles, Star, Trophy } from "lucide-react";

import type { CineQuest } from "@/lib/cineQuests";
import { getQuestMonthKey } from "@/lib/cineQuests";
import { trackEngagementEvent } from "@/lib/engagement";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const ACCENT_STYLES: Record<CineQuest["accent"], { border: string; icon: string; bar: string }> = {
  rose: { border: "border-rose-300/20", icon: "bg-rose-300/12 text-rose-300", bar: "from-rose-500 to-rose-200" },
  amber: { border: "border-amber-300/20", icon: "bg-amber-300/12 text-amber-300", bar: "from-amber-500 to-amber-200" },
  violet: { border: "border-violet-300/20", icon: "bg-violet-300/12 text-violet-300", bar: "from-violet-500 to-violet-200" },
  emerald: { border: "border-emerald-300/20", icon: "bg-emerald-300/12 text-emerald-300", bar: "from-emerald-500 to-emerald-200" },
};

export function CineQuestCard({ quest }: { quest: CineQuest }) {
  const { t } = useTranslation();
  const style = ACCENT_STYLES[quest.accent];
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
    <article className={cn("relative overflow-hidden rounded-3xl border bg-card/60 p-5 transition duration-200 hover:-translate-y-0.5 hover:bg-card/80", style.border, quest.completed && "shadow-[0_16px_45px_hsl(var(--primary)/0.08)]")}>
      <div className="flex items-start gap-3">
        <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", style.icon)}>
          {quest.completed ? <Trophy className="h-5 w-5" /> : <Film className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-foreground">{quest.title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{quest.description}</p>
            </div>
            {quest.completed ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/12 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                <Check className="h-3 w-3" />
                {t("quests.complete", "Complete")}
              </span>
            ) : (
              <LockKeyhole className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
            )}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>{quest.progress}/{quest.target}</span>
            <span className="inline-flex items-center gap-1 text-foreground"><Sparkles className="h-3 w-3 text-amber-300" />{quest.reward}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/60">
            <div className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-300", style.bar)} style={{ width: `${Math.max(6, progress)}%` }} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Flame className="h-3 w-3 text-amber-300" />{quest.completed ? t("quests.rewardUnlocked", "Reward unlocked") : t("quests.keepGoing", "Keep going")}</span>
            <Link to="/watched" className="inline-flex items-center gap-1 text-xs font-bold text-primary transition hover:text-primary/80">
              {t("quests.logActivity", "Log activity")}
              <Star className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
