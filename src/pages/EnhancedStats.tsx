import { useTranslation } from "react-i18next";
import { Clock, Film, Star, Tv, Trophy } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GlassStatCard } from "@/components/GlassStatCard";
import { useEnhancedStatsData, type MediaTypeFilter } from "@/hooks/useEnhancedStatsData";
import { useIsMobile } from "@/hooks/use-mobile";

const EnhancedStatsCharts = lazy(
  () => import("@/components/stats/EnhancedStatsCharts"),
);

const CINEMATIC_CHART_COLORS = [
  "#E50914",
  "#F97316",
  "#F2C572",
  "#FB7185",
  "#B91C1C",
  "#FDBA74",
  "#7F1D1D",
  "#FCD34D",
];

const GOAL_PRESETS = [50, 100, 150, 200, 300, 500];

/** Inline radial SVG gauge — no external dep needed */
function RadialProgressGauge({
  value,
  goal,
  onGoalChange,
}: {
  value: number;
  goal: number;
  onGoalChange: (g: number) => void;
}) {
  const radius = 52;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const progress = Math.min(value / goal, 1);
  const dashOffset = circumference * (1 - progress);
  const pct = Math.round(progress * 100);
  const completed = pct >= 100;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Yearly Binge Goal
      </p>
      <div className="relative flex items-center justify-center">
        <svg width={radius * 2} height={radius * 2} className="-rotate-90">
          {/* Track */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          {/* Progress arc */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={completed ? "#22c55e" : "#E50914"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        {/* Center label */}
        <div className="absolute flex flex-col items-center justify-center">
          {completed ? (
            <Trophy className="h-6 w-6 text-green-400" />
          ) : (
            <>
              <span className="text-xl font-extrabold leading-none text-foreground">{pct}%</span>
              <span className="text-[10px] text-muted-foreground">{Math.round(value)}h/{goal}h</span>
            </>
          )}
        </div>
      </div>
      {/* Goal selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Goal:</span>
        <div className="flex gap-1">
          {GOAL_PRESETS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGoalChange(g)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                goal === g
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/8 text-muted-foreground hover:bg-white/15"
              }`}
            >
              {g}h
            </button>
          ))}
        </div>
      </div>
      {completed && (
        <p className="text-xs font-semibold text-green-400">
          🎉 Goal smashed! You&apos;re a true cinephile.
        </p>
      )}
    </div>
  );
}

export default function EnhancedStats() {
  const { i18n, t } = useTranslation();
  const isMobile = useIsMobile();
  const language = i18n.language;
  const [bingeGoal, setBingeGoal] = useState(200);
  const {
    mediaLoading,
    selectedYear,
    setSelectedYear,
    selectedType,
    setSelectedType,
    selectedLang,
    setSelectedLang,
    years,
    languages,
    filteredMedia,
    totalMovies,
    totalTV,
    totalEpisodes,
    totalHours,
    genreStats,
  } = useEnhancedStatsData(language);

  if (mediaLoading) {
    return (
      <div className="page-container flex min-h-[40vh] items-center justify-center pt-20">
        <div className="ct-panel px-6 py-10 text-center">
          <span className="text-lg text-muted-foreground">Loading stats...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ct-page-shell min-h-screen">
      <div className="page-container w-full max-w-6xl space-y-10 pt-20 pb-24 md:pb-10">
        <div className="ct-panel-strong relative flex flex-col items-center justify-center py-10 text-center">
          <Clock className="mb-4 h-12 w-12 text-primary drop-shadow-lg" />
          <p className="ct-kicker mb-3">Annual Watching Snapshot</p>
          <div className="mb-2 text-6xl font-extrabold tracking-tight text-foreground drop-shadow-xl md:text-7xl">
            {Math.round(totalHours)}
            <span className="align-super text-2xl font-bold text-primary">h</span>
          </div>
          <div className="mb-1 text-lg font-medium text-foreground md:text-xl">
            {t("stats.hoursWatched", "Hours Watched")}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("stats.daysTotal", "{{count}} days total", {
              count: Math.round(totalHours / 24),
            })}
          </div>

          {/* Radial binge-goal gauge */}
          <div className="mt-8 border-t border-white/8 pt-6 w-full flex justify-center">
            <RadialProgressGauge
              value={totalHours}
              goal={bingeGoal}
              onGoalChange={setBingeGoal}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <GlassStatCard
            icon={Film}
            label={t("stats.totalMovies", "Total Movies")}
            value={totalMovies}
            description={t("stats.moviesWatched", "Movies watched")}
            variant="primary"
            size="md"
            delay={0}
          />
          <GlassStatCard
            icon={Tv}
            label={t("stats.totalTVShows", "Total TV Shows")}
            value={totalTV}
            description={t("stats.tvShowsWatched", "TV shows watched")}
            variant="warning"
            size="md"
            delay={0.05}
          />
          <GlassStatCard
            icon={Star}
            label={t("stats.episodesWatched", "Episodes Watched")}
            value={totalEpisodes}
            description={t("stats.episodesTotal", "Total episodes watched")}
            variant="danger"
            size="md"
            delay={0.1}
          />
          <GlassStatCard
            icon={Clock}
            label={t("stats.totalWatched", "Total Watched")}
            value={filteredMedia.length}
            description={`${totalMovies} ${t("common.movies", "Movies").toLowerCase()}, ${totalTV} ${t("common.tvShows", "TV Shows").toLowerCase()}`}
            variant="success"
            size="md"
            delay={0.15}
          />
        </div>

        <div className="ct-toolbar grid w-full grid-cols-1 justify-center gap-3 sm:flex sm:w-auto sm:flex-wrap">
          <div className="ct-filter-field w-full sm:w-auto">
            <label className="ct-filter-label">Year</label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) =>
                setSelectedYear(value === "all" ? "all" : Number(value))
              }
            >
              <SelectTrigger className="rounded-2xl border-border/60 bg-card/70 text-foreground">
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/60 bg-popover/95">
                <SelectItem value="all">All</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ct-filter-field w-full sm:w-auto">
            <label className="ct-filter-label">Type</label>
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as MediaTypeFilter)}
            >
              <SelectTrigger className="rounded-2xl border-border/60 bg-card/70 text-foreground">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/60 bg-popover/95">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="movie">Movie</SelectItem>
                <SelectItem value="tv">TV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ct-filter-field w-full sm:w-auto">
            <label className="ct-filter-label">Language</label>
            <Select value={selectedLang} onValueChange={setSelectedLang}>
              <SelectTrigger className="rounded-2xl border-border/60 bg-card/70 text-foreground">
                <SelectValue placeholder="All languages" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/60 bg-popover/95">
                <SelectItem value="all">All</SelectItem>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {genreStats.length > 0 && (
          <Suspense
            fallback={
              <div className="grid gap-8 md:grid-cols-2">
                <Card className="ct-panel">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-foreground">
                      {t("stats.genreDistribution", "Genre Distribution")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[240px] animate-pulse rounded-lg bg-white/5 md:h-[300px]" />
                  </CardContent>
                </Card>
                <Card className="ct-panel">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-foreground">
                      {t("stats.hoursByGenre", "Hours by Genre")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[240px] animate-pulse rounded-lg bg-white/5 md:h-[300px]" />
                  </CardContent>
                </Card>
              </div>
            }
          >
            <EnhancedStatsCharts
              genreStats={genreStats}
              isMobile={isMobile}
              colors={CINEMATIC_CHART_COLORS}
              labels={{
                genreDistribution: t("stats.genreDistribution", "Genre Distribution"),
                hoursByGenre: t("stats.hoursByGenre", "Hours by Genre"),
              }}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
