import { useEffect, useMemo, useState } from "react";
import { Check, CircleHelp, Copy, Flame, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  getDailyTrivia,
  readDailyTriviaState,
  saveDailyTriviaAnswer,
  type DailyTriviaState,
} from "@/lib/dailyTrivia";
import { trackEngagementEvent } from "@/lib/engagement";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const TRIVIA_EVENT_KEY = "cinetrekker_daily_trivia_event_day_v1";

export function DailyTriviaCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const question = useMemo(() => getDailyTrivia(), []);
  const [state, setState] = useState<DailyTriviaState>(() => readDailyTriviaState());

  useEffect(() => {
    if (!state.answered || typeof window === "undefined") return;
    const today = state.dayKey;
    if (window.localStorage.getItem(TRIVIA_EVENT_KEY) === today) return;

    window.localStorage.setItem(TRIVIA_EVENT_KEY, today);
    trackEngagementEvent("trivia_answer", {
      questionId: question.id,
      correct: state.correct,
      streak: state.streak,
    });
  }, [question.id, state.answered, state.correct, state.dayKey, state.streak]);

  const answer = (index: number) => {
    if (state.answered) return;
    setState(saveDailyTriviaAnswer(question, index));
  };

  const copyResult = async () => {
    const result = state.correct
      ? `I got today&apos;s CineTrekker trivia right. ${state.streak}-day streak.`
      : `I took today&apos;s CineTrekker trivia challenge.`;
    try {
      await navigator.clipboard.writeText(result);
      toast({ title: t("trivia.copied", "Result copied"), description: t("trivia.copiedDescription", "Share your cinema knowledge with a friend.") });
    } catch {
      toast({ title: t("trivia.copyUnavailable", "Copy unavailable"), variant: "destructive" });
    }
  };

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_42%),linear-gradient(135deg,hsla(var(--card)/0.98),hsla(var(--background)/0.94))] p-5 md:p-6" aria-labelledby="daily-trivia-title">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -bottom-24 h-48 w-48 rounded-full bg-cyan-400/8 blur-3xl" />
      <div className="relative">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/90">
              <CircleHelp className="h-4 w-4" aria-hidden="true" />
              {t("trivia.eyebrow", "Daily trivia")}
            </div>
            <h2 id="daily-trivia-title" className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {t("trivia.title", "One question for your inner cinephile")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {state.answered
                ? t("trivia.answeredDescription", "That&apos;s today&apos;s challenge complete. Come back tomorrow for a new one.")
                : t("trivia.description", "Answer correctly to build a small daily knowledge streak.")}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-200">
            <Flame className="h-4 w-4" aria-hidden="true" />
            {state.streak} {t("trivia.dayStreak", "day streak")}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/30 p-4 md:p-5">
          <p className="text-base font-bold leading-6 text-foreground md:text-lg">{question.prompt}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {question.options.map((option, index) => {
              const isCorrect = index === question.answerIndex;
              const isSelected = index === state.selectedIndex;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={state.answered}
                  onClick={() => answer(index)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl border px-3.5 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                    !state.answered && "border-border/60 bg-card/40 text-foreground hover:border-cyan-300/40 hover:bg-cyan-300/5",
                    state.answered && isCorrect && "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
                    state.answered && isSelected && !isCorrect && "border-rose-300/40 bg-rose-300/10 text-rose-100",
                    state.answered && !isCorrect && !isSelected && "border-border/40 bg-background/20 text-muted-foreground",
                  )}
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-background/40 text-xs">
                    {state.answered && isCorrect ? <Check className="h-3.5 w-3.5" /> : state.answered && isSelected ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
          {state.answered && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                <p className="text-xs leading-5 text-muted-foreground">{question.explanation}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyResult()} className="min-h-9 shrink-0 gap-2 bg-background/35">
                <Copy className="h-3.5 w-3.5" />
                {t("trivia.shareResult", "Share result")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
