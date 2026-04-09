import { Flame, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEngagementLoop } from "@/hooks/useEngagementLoop";

export function EngagementReminderStrip() {
  const { t } = useTranslation();
  const { streakDays, comebackDays, reminderTone } = useEngagementLoop();

  if (streakDays <= 0 && comebackDays <= 0) return null;

  const content =
    reminderTone === "comeback"
      ? {
          icon: RotateCcw,
          title: t("home.comebackTitle", "Welcome back"),
          body: t(
            "home.comebackBody",
            "You were away for {{days}} days. Pick one title and rebuild momentum tonight.",
            { days: Math.max(1, comebackDays) },
          ),
          href: "/watchlist",
        }
      : reminderTone === "streak"
        ? {
            icon: Flame,
            title: t("home.streakTitle", "Streak is alive"),
            body: t(
              "home.streakBody",
              "{{days}}-day streak. Keep it going by finishing one queued title.",
              { days: Math.max(1, streakDays) },
            ),
            href: "/watched",
          }
        : {
            icon: Sparkles,
            title: t("home.nudgeTitle", "Quick daily nudge"),
            body: t(
              "home.nudgeBody",
              "Small daily actions shape better recommendations. Save or watch one title now.",
            ),
            href: "/discover",
          };

  const Icon = content.icon;

  return (
    <Link
      to={content.href}
      data-testid="engagement-reminder-strip"
      className="ct-panel mb-5 flex items-start gap-3 border-primary/25 bg-primary/10 p-4"
    >
      <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{content.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{content.body}</p>
      </div>
    </Link>
  );
}

