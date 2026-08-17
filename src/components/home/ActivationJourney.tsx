import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  BookmarkPlus,
  Check,
  ChevronRight,
  Clapperboard,
  Eye,
  Heart,
  Sparkles,
  Tv,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useUserLists } from "@/contexts/UserListsContext";
import { useTitleFollows } from "@/hooks/useTitleFollows";
import { usePinnedFavorites } from "@/hooks/usePinnedFavorites";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trackProductEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type ActivationStep = {
  id: "queue" | "watch" | "follow" | "taste";
  title: string;
  description: string;
  href: string;
  action: string;
  isComplete: boolean;
  icon: typeof BookmarkPlus;
  optional?: boolean;
  progressLabel?: string;
};

const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

export function ActivationJourney() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { watchlist, watched } = useUserLists();
  const { followedTitles } = useTitleFollows();
  const { pinnedFavoriteKeys } = usePinnedFavorites({ userId: user?.id });
  const [dismissedUntil, setDismissedUntil] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const completionTrackedRef = useRef(false);

  const storageKey = useMemo(
    () => `cinetrekker_activation_hidden_until_${user?.id ?? "guest"}`,
    [user?.id],
  );

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;

    const raw = window.localStorage.getItem(storageKey);
    const nextDismissedUntil = raw ? Number(raw) : null;
    setDismissedUntil(Number.isFinite(nextDismissedUntil) ? nextDismissedUntil : null);
    setHydrated(true);
  }, [storageKey, user?.id]);

  const steps: ActivationStep[] = [
    {
      id: "queue",
      title: t("activation.queueTitle", "Build a queue you trust"),
      description: t("activation.queueDescription", "Save three movies or series you genuinely want to watch."),
      href: "/discover",
      action: t("activation.queueAction", "Find titles"),
      isComplete: watchlist.length >= 3,
      icon: BookmarkPlus,
      progressLabel: t("activation.queueProgress", {
        count: Math.min(watchlist.length, 3),
        defaultValue: "{{count}} of 3 saved",
      }),
    },
    {
      id: "watch",
      title: t("activation.watchTitle", "Remember your last watch"),
      description: t("activation.watchDescription", "Log one film or episode so your progress can start working for you."),
      href: "/search",
      action: t("activation.watchAction", "Log a watch"),
      isComplete: watched.length > 0,
      icon: Eye,
      progressLabel: watched.length > 0 ? t("activation.complete", "Complete") : t("activation.notStarted", "Not started"),
    },
    {
      id: "follow",
      title: t("activation.followTitle", "Keep a show on your radar"),
      description: t("activation.followDescription", "Follow one series to surface new episodes and release days."),
      href: "/discover",
      action: t("activation.followAction", "Explore series"),
      isComplete: followedTitles.length > 0,
      icon: Tv,
      progressLabel: followedTitles.length > 0 ? t("activation.complete", "Complete") : t("activation.notStarted", "Not started"),
    },
    {
      id: "taste",
      title: t("activation.tasteTitle", "Shape your taste"),
      description: t("activation.tasteDescription", "Pin two favorites to sharpen Taste Match and recommendations."),
      href: "/profile",
      action: t("activation.tasteAction", "Add favorites"),
      isComplete: pinnedFavoriteKeys.length >= 2,
      icon: Heart,
      optional: true,
      progressLabel: t("activation.tasteProgress", {
        count: Math.min(pinnedFavoriteKeys.length, 2),
        defaultValue: "{{count}} of 2 pinned",
      }),
    },
  ];

  const requiredSteps = steps.filter((step) => !step.optional);
  const completedRequired = requiredSteps.filter((step) => step.isComplete).length;
  const progressValue = (completedRequired / requiredSteps.length) * 100;
  const isReady = completedRequired === requiredSteps.length;
  const isDismissed = dismissedUntil !== null && dismissedUntil > Date.now();

  useEffect(() => {
    if (!user?.id || !isReady || completionTrackedRef.current) return;
    completionTrackedRef.current = true;
    trackProductEvent("activation_completed", {
      completed_required_steps: "3",
      optional_taste_complete: pinnedFavoriteKeys.length >= 2 ? "yes" : "no",
    });
  }, [isReady, pinnedFavoriteKeys.length, user?.id]);

  const hideForNow = () => {
    const nextDismissedUntil = Date.now() + DISMISS_WINDOW_MS;
    window.localStorage.setItem(storageKey, String(nextDismissedUntil));
    setDismissedUntil(nextDismissedUntil);
    trackProductEvent("activation_dismissed", {
      completed_required_steps: String(completedRequired) as "0" | "1" | "2",
    });
  };

  if (!user || !hydrated || isReady || isDismissed) return null;

  return (
    <section
      className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-[radial-gradient(circle_at_top_right,rgba(229,9,20,0.18),transparent_42%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--background)))] p-4 shadow-[0_20px_56px_rgba(0,0,0,0.16)] md:p-6"
      aria-labelledby="activation-journey-title"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
        <div className="flex gap-3 sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/90">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t("activation.eyebrow", "Make CineTrekker yours")}
            </div>
            <h2 id="activation-journey-title" className="mt-1.5 text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {t("activation.title", "Set up your watch home in a few easy moves.")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("activation.description", "Complete any time. These small choices make your watchlist, Up Next, and release radar useful much faster.")}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:bg-background/60 hover:text-foreground"
            onClick={hideForNow}
            aria-label={t("activation.hide", "Hide setup for now")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-5 rounded-2xl border border-border/60 bg-background/35 p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Clapperboard className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">
                {t("activation.progressLabel", "Your tracker is {{count}} of {{total}} steps ready", {
                  count: completedRequired,
                  total: requiredSteps.length,
                })}
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold text-primary">{Math.round(progressValue)}%</span>
          </div>
          <Progress value={progressValue} className="mt-3 h-2 bg-muted/70 [&>div]:bg-primary" />
        </div>

        <ol className="mt-4 grid gap-2.5 md:grid-cols-2" aria-label={t("activation.stepsLabel", "Account setup steps")}>
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.id}
                className={cn(
                  "group relative flex min-h-[116px] gap-3 rounded-2xl border p-3.5 transition-colors sm:p-4",
                  step.isComplete
                    ? "border-primary/20 bg-primary/[0.045]"
                    : "border-border/60 bg-background/30 hover:border-primary/30 hover:bg-background/55",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                    step.isComplete
                      ? "border-primary/20 bg-primary text-primary-foreground"
                      : "border-border/60 bg-background/60 text-primary",
                  )}
                >
                  {step.isComplete ? <Check className="h-4.5 w-4.5" aria-hidden="true" /> : <Icon className="h-4.5 w-4.5" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1 pr-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{step.title}</p>
                    {step.optional ? (
                      <span className="rounded-full border border-border/60 bg-background/55 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {t("common.optional", "Optional")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{step.description}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={cn("text-xs font-semibold", step.isComplete ? "text-primary" : "text-muted-foreground")}>
                      {step.isComplete ? t("activation.done", "Done") : step.progressLabel}
                    </span>
                    {!step.isComplete ? (
                      <Link
                        to={step.href}
                        onClick={() => {
                          trackProductEvent("activation_step_opened", { step: step.id });
                        }}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg px-1 text-xs font-bold text-primary transition hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {step.action}
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
