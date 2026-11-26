import { lazy, Suspense, type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  Award,
  CalendarDays,
  Clock,
  Eye,
  Film,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  BarChart3,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { UserMediaItem } from "@/types/media";

const HomeStatsSnapshot = lazy(
  () =>
    import("@/components/home/HomeStatsSnapshot").then((m) => ({
      default: m.HomeStatsSnapshot,
    })),
);

export interface ProfileOverviewStatsProps {
  text: (key: string, fallback: string) => string;
  itemVariants: Variants;
  isProfileInactive: boolean;
  onOpenTasteTab: () => void;
  watched: UserMediaItem[];
  watchlist: UserMediaItem[];
  countMoviesWatched: number;
  watchedThisMonth: number;
  countRatings: number;
  latestRatedDateLabel: string;
  totalWatchDaysHoursMinutes: string;
  averageMovieHours: string | number;
  cinephilePersona?: {
    icon: ReactNode;
    title: string;
    description: string;
    badge: string;
  } | null;
  viewingState: {
    current: number;
    completed: number;
    planned: number;
    pausedOrDropped: number;
  };
  nextAchievementMilestone?: {
    label: string;
    target: number;
  } | null;
  moviesWatched: number;
  recentViewingSummary: {
    titlesLogged: number;
    activeDays: number;
    hours: string | number;
  };
}

export function ProfileOverviewStats({
  text,
  itemVariants,
  isProfileInactive,
  onOpenTasteTab,
  watched,
  watchlist,
  countMoviesWatched,
  watchedThisMonth,
  countRatings,
  latestRatedDateLabel,
  totalWatchDaysHoursMinutes,
  averageMovieHours,
  cinephilePersona,
  viewingState,
  nextAchievementMilestone,
  moviesWatched,
  recentViewingSummary,
}: ProfileOverviewStatsProps) {
  const { t } = useTranslation();

  return (
    <motion.section variants={itemVariants} id="stats-overview" className="profile-overview space-y-6">
      <div className="profile-section-heading flex flex-col gap-3 border-b border-border/65 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="profile-hero-eyebrow text-[10px] font-semibold uppercase text-primary">
            {text("profile.overviewEyebrow", "Profile overview")}
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
            <TrendingUp className="h-5 w-5 text-primary" />
            {text("profile.viewingProfile", "Your screen story")}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {text("profile.overviewSubtitle", "Your current pace, defining taste, and latest watches in one focused view.")}
          </p>
        </div>
        {!isProfileInactive ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-fit text-xs text-muted-foreground hover:text-foreground"
            onClick={onOpenTasteTab}
          >
            {text("profile.openTasteStats", "Open Taste & Stats")}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {!isProfileInactive ? (
        <>
          <Suspense fallback={null}>
            <HomeStatsSnapshot
              watched={watched}
              watchlist={watchlist}
              ctaHref="#taste"
              ctaLabel={text("profile.openTasteStats", "Open Taste & Stats")}
            />
          </Suspense>

          <section className="gamification-hub mt-6" aria-label={text("profile.milestonesAndInsights", "Milestones & Insights")}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {text("profile.trackingMilestones", "Trophies & Deep Analytics")}
                </p>
                <h3 className="text-lg font-semibold text-foreground">
                  {text("profile.milestonesAndInsights", "Milestones & Insights")}
                </h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Link
                to="/stats"
                className="group flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-3.5 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card/90"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {text("nav.stats", "Detailed Stats")}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {text("profile.detailedStatsDesc", "Full taste & time breakdown")}
                  </p>
                </div>
              </Link>
              <Link
                to="/achievements"
                className="group flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-3.5 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card/90"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {text("nav.achievements", "Achievements")}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {text("profile.achievementsDesc", "Unlocked milestones & badges")}
                  </p>
                </div>
              </Link>
              <Link
                to="/quests"
                className="group flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-3.5 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card/90"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Award className="h-4 w-4" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {text("nav.quests", "Monthly Quests")}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {text("profile.questsDesc", "Tracker challenges & tasks")}
                  </p>
                </div>
              </Link>
              <Link
                to="/year-in-review"
                className="group flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-3.5 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card/90"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {text("nav.yearInReview", "Year in Review")}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {text("profile.yearInReviewDesc", "Your annual wrapped recap")}
                  </p>
                </div>
              </Link>
            </div>
          </section>
        </>
      ) : null}

      <div className="hidden grid-cols-1 gap-4 md:grid-cols-3">
        {/* Movies Watched Card */}
        <button
          type="button"
          onClick={onOpenTasteTab}
          className="profile-insight group relative overflow-hidden p-5 text-left focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Film className="mb-3 h-5 w-5 text-muted-foreground" />
          <p className="text-4xl font-bold leading-none tracking-tight text-foreground">
            {countMoviesWatched}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {text("profile.moviesWatched", "Movies Watched")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            {t("profile.watchedThisMonth", "+{{count}} this month", {
              count: watchedThisMonth,
            })}
          </p>
        </button>

        {/* Ratings Card */}
        <button
          type="button"
          onClick={onOpenTasteTab}
          className="profile-insight group relative overflow-hidden p-5 text-left focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Star className="mb-3 h-5 w-5 text-muted-foreground" />
          <p className="text-4xl font-bold leading-none tracking-tight text-foreground">
            {countRatings}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {text("profile.ratings", "Ratings")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            {latestRatedDateLabel}
          </p>
        </button>

        {/* Watch Time Card */}
        <button
          type="button"
          onClick={onOpenTasteTab}
          className="profile-insight group relative overflow-hidden p-5 text-left focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Clock className="mb-3 h-5 w-5 text-muted-foreground" />
          <p className="text-3xl font-bold leading-none tracking-tight text-foreground">
            {totalWatchDaysHoursMinutes}
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {text("profile.watchTime", "Watch Time")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            {t("profile.averageHoursPerMovie", "Avg {{hours}}h per movie", {
              hours: averageMovieHours,
            })}
          </p>
        </button>
      </div>

      {!isProfileInactive ? (
        <>
          {/* Persona & Level Details row */}
          <div className="profile-overview-grid grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Persona Card */}
            {cinephilePersona && (
              <div className="h-full">
                <Card className="border border-border bg-card h-full transition-colors duration-150 hover:bg-accent/20">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-muted p-3 text-foreground">
                        {cinephilePersona.icon}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {text("profile.tasteArchetype", "Taste Archetype")}
                        </p>
                        <h4 className="text-xl font-bold tracking-tight text-foreground">
                          {cinephilePersona.title}
                        </h4>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {cinephilePersona.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted border border-border text-foreground">
                        {cinephilePersona.badge}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Viewing state and next reward */}
            <Card className="border border-border bg-card h-full transition-colors duration-150 hover:bg-accent/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-3 text-foreground">
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {text("profile.viewingState", "Viewing state")}
                    </p>
                    <h4 className="text-xl font-bold tracking-tight text-foreground">
                      {text("profile.whatYoureTracking", "What you’re tracking")}
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Link to="/watchlist" className="rounded-lg border border-border/70 bg-background/45 px-2.5 py-2 transition-colors hover:bg-accent">
                    <p className="text-lg font-bold tabular-nums text-foreground">{viewingState.current}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{text("profile.current", "Current")}</p>
                  </Link>
                  <Link to="/watched" className="rounded-lg border border-border/70 bg-background/45 px-2.5 py-2 transition-colors hover:bg-accent">
                    <p className="text-lg font-bold tabular-nums text-foreground">{viewingState.completed}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{text("profile.completed", "Completed")}</p>
                  </Link>
                  <Link to="/watchlist" className="rounded-lg border border-border/70 bg-background/45 px-2.5 py-2 transition-colors hover:bg-accent">
                    <p className="text-lg font-bold tabular-nums text-foreground">{viewingState.planned}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{text("profile.planned", "Planned")}</p>
                  </Link>
                  <Link to="/watched" className="rounded-lg border border-border/70 bg-background/45 px-2.5 py-2 transition-colors hover:bg-accent">
                    <p className="text-lg font-bold tabular-nums text-foreground">{viewingState.pausedOrDropped}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{text("profile.paused", "Paused")}</p>
                  </Link>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Award className="h-4 w-4 shrink-0 text-primary" />
                      <p className="truncate text-xs font-semibold text-foreground">
                        {nextAchievementMilestone
                          ? `${text("profile.nextAchievement", "Next achievement")}: ${nextAchievementMilestone.label}`
                          : text("profile.allMilestonesUnlocked", "All core milestones unlocked")}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-primary">
                      {nextAchievementMilestone
                        ? `${moviesWatched}/${nextAchievementMilestone.target}`
                        : "✓"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <motion.section variants={itemVariants} id="profile-weekly-recap">
            <Card className="profile-recap-card border border-border bg-card">
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    {text("profile.sevenDayRecap", "7-day recap")}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-foreground">
                    {recentViewingSummary.titlesLogged > 0
                      ? text("profile.recentRhythm", "Your recent viewing rhythm")
                      : text("profile.startYourWeek", "Start your next watch")}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {recentViewingSummary.titlesLogged > 0
                      ? t("profile.recentRecapDetail", "{{titles}} title(s) across {{days}} active day(s) and about {{hours}} hour(s).", {
                          titles: recentViewingSummary.titlesLogged,
                          days: recentViewingSummary.activeDays,
                          hours: recentViewingSummary.hours,
                        })
                      : text("profile.recentRecapEmpty", "Log a title to begin building your personal viewing story.")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/watched">{text("profile.openDiary", "Open history")}</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/year-in-review">{text("profile.yearInReview", "Year in Review")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </>
      ) : (
        <Card className="border border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                {text("profile.startYourWeek", "Start your next watch")}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                {text("profile.viewingProfile", "Your screen story")}
              </h3>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {text("profile.recentRecapEmpty", "Log a title to begin building your personal viewing story.")}
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link to="/discover">
                {text("watched.discoverTitles", "Discover titles")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </motion.section>
  );
}
