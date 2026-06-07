import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle, Sparkles, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { useUserLists } from "@/contexts/UserListsContext";
import { useCookieConsent } from "@/hooks/useCookieConsent";

export function OnboardingChecklist() {
  const { t } = useTranslation();
  const { watchlist, watched } = useUserLists();
  const { choice: cookieChoice } = useCookieConsent();
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("cinetrekker_inline_checklist_dismissed") === "true";
  });

  const steps = [
    {
      id: "save",
      label: t("onboarding.checklist.save", "Save your first title to watchlist"),
      isCompleted: watchlist.length > 0,
    },
    {
      id: "watched",
      label: t("onboarding.checklist.watched", "Mark one movie or TV show as watched"),
      isCompleted: watched.length > 0,
    },
    {
      id: "cookies",
      label: t("onboarding.checklist.cookies", "Customize your tracking preferences"),
      isCompleted: cookieChoice !== null,
    },
  ];

  const completedCount = steps.filter((step) => step.isCompleted).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const allCompleted = completedCount === steps.length;

  useEffect(() => {
    if (typeof window === "undefined" || isDismissed) return;

    const hasRunConfetti = window.localStorage.getItem("cinetrekker_checklist_confetti_fired") === "true";

    if (allCompleted && !hasRunConfetti) {
      window.localStorage.setItem("cinetrekker_checklist_confetti_fired", "true");
      void confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#E50914", "#F97316", "#3B82F6", "#10B981", "#ffffff"],
        gravity: 1.0,
        scalar: 1.1,
      });
    }
  }, [allCompleted, isDismissed]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cinetrekker_inline_checklist_dismissed", "true");
    }
    setIsDismissed(true);
  };

  // If dismissed or all completed and already seen/fired, don't show the widget to keep the page clean
  if (isDismissed) return null;

  return (
    <section className="ct-panel-strong border border-primary/20 bg-[radial-gradient(circle_at_top_right,rgba(217,4,41,0.06),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(0,0,0,0.2)_100%)] p-5 md:p-6 rounded-3xl animate-fade-in shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <h2 className="text-lg font-bold text-foreground">
              {t("onboarding.checklist.title", "Getting Started Checklist")}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("onboarding.checklist.subtitle", "Complete these quick steps to master CineTrekker and build your local library.")}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">
              {completedCount} / {steps.length} {t("onboarding.checklist.completed", "Completed")}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {progressPercent}% {t("onboarding.checklist.progress", "Progress")}
            </p>
          </div>
          <div className="relative h-12 w-12 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <circle
                className="text-white/10"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                r="16"
                cx="18"
                cy="18"
              />
              <circle
                className="text-primary transition-all duration-500 ease-out"
                strokeWidth="3"
                strokeDasharray="100, 100"
                strokeDashoffset={100 - progressPercent}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                r="16"
                cx="18"
                cy="18"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-start gap-3 rounded-2xl border p-4 transition-all duration-300 ${
              step.isCompleted
                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-100"
                : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.04]"
            }`}
          >
            {step.isCompleted ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-white/20" />
            )}
            <div className="min-w-0">
              <p className={`text-xs font-medium leading-relaxed ${step.isCompleted ? "text-emerald-200/90 line-through" : "text-foreground/80"}`}>
                {step.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {allCompleted && (
        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 animate-pulse">
          <p className="text-xs font-medium text-emerald-300">
            🎉 {t("onboarding.checklist.success", "Congratulations! You have completed all setup steps.")}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 text-xs text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
          >
            {t("common.dismiss", "Dismiss")}
          </Button>
        </div>
      )}
    </section>
  );
}
