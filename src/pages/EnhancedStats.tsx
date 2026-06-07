import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Film, Tv, Trophy } from "lucide-react";
import { useUserLists } from "@/contexts/UserListsContext";
import { useEnhancedStatsData, type MediaTypeFilter } from "@/hooks/useEnhancedStatsData";
import { useIsMobile } from "@/hooks/use-mobile";
import SEO from "@/components/SEO";
import { GlassStatCard } from "@/components/GlassStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EnhancedStatsCharts = lazy(() =>
  import("@/components/stats/EnhancedStatsCharts"),
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

function RadialProgressGauge({
  value,
  goal,
  onGoalChange,
}: {
  value: number;
  goal: number;
  onGoalChange: (nextGoal: number) => void;
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
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
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
        <div className="absolute flex flex-col items-center justify-center">
          {completed ? (
            <Trophy className="h-6 w-6 text-green-400" />
          ) : (
            <>
              <span className="text-xl font-extrabold leading-none text-foreground">{pct}%</span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round(value)}h/{goal}h
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {GOAL_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onGoalChange(preset)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              goal === preset
                ? "bg-primary text-primary-foreground"
                : "bg-white/8 text-muted-foreground hover:bg-white/15"
            }`}
          >
            {preset}h
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterCard({
  label,
  value,
  onValueChange,
  items,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  items: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-2xl border-border/70 bg-background/80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function EnhancedStats() {
  const { t, i18n } = useTranslation();
  const { watched } = useUserLists();
  const language = i18n.language;
  const isMobile = useIsMobile();
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

  const yearOptions = [
    { value: "all", label: t("stats.filters.allYears", "All years") },
    ...years.map((year) => ({ value: String(year), label: String(year) })),
  ];
  const typeOptions: Array<{ value: string; label: string }> = [
    { value: "all", label: t("stats.filters.allTypes", "All types") },
    { value: "movie", label: t("common.movies", "Movies") },
    { value: "tv", label: t("common.tvShows", "TV shows") },
  ];
  const languageOptions = [
    { value: "all", label: t("stats.filters.allLanguages", "All languages") },
    ...languages.map((entry) => ({ value: entry, label: entry.toUpperCase() })),
  ];

  const totalWatched = filteredMedia.length;
  const averageHours = totalWatched > 0 ? totalHours / totalWatched : 0;

  return (
    <div className="ct-page-shell min-h-screen">
      <SEO
        title="Enhanced Stats — CineTrekker"
        description="View detailed statistics about your watching habits."
        canonical="https://cinetrekker.vercel.app/stats"
      />

      <div className="page-container w-full max-w-6xl space-y-8 pb-24 pt-20 md:pb-10">
        <header className="ct-panel-strong space-y-5 p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="ct-kicker">{t("stats.titleKicker", "Annual Watching Snapshot")}</p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
                {t("stats.title", "Your Stats")}
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {t(
                  "stats.subtitle",
                  "A quick read on what you watch, how long you spend, and which genres dominate your history.",
                )}
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card/60 p-4">
              <Clock className="h-10 w-10 text-primary" />
              <div className="text-center">
                <div className="text-5xl font-extrabold tracking-tight text-foreground md:text-6xl">
                  {Math.round(totalHours)}
                  <span className="align-super text-2xl font-bold text-primary">h</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("stats.hoursWatched", "Hours Watched")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <GlassStatCard
              icon={Film}
              label={t("stats.totalMovies", "Movies")}
              value={totalMovies}
              description={t("stats.moviesDescription", "{{count}} movie entries", {
                count: totalMovies,
              })}
              variant="primary"
              size="md"
              delay={0}
            />
            <GlassStatCard
              icon={Tv}
              label={t("stats.totalTV", "TV Shows")}
              value={totalTV}
              description={t("stats.tvDescription", "{{count}} TV entries", {
                count: totalTV,
              })}
              variant="success"
              size="md"
              delay={0.05}
            />
            <GlassStatCard
              icon={Clock}
              label={t("stats.totalEpisodes", "Episodes")}
              value={totalEpisodes}
              description={t("stats.episodesDescription", "Across the filtered library")}
              variant="warning"
              size="md"
              delay={0.1}
            />
            <GlassStatCard
              icon={Trophy}
              label={t("stats.avgRuntime", "Avg. Hours")}
              value={averageHours.toFixed(1)}
              description={t("stats.avgRuntimeDescription", "Per watched title")}
              variant="danger"
              size="md"
              delay={0.15}
            />
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <FilterCard
              label={t("stats.filters.year", "Year")}
              value={selectedYear === "all" ? "all" : String(selectedYear)}
              onValueChange={(value) => setSelectedYear(value === "all" ? "all" : Number(value))}
              items={yearOptions}
            />
            <FilterCard
              label={t("stats.filters.type", "Type")}
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as MediaTypeFilter)}
              items={typeOptions}
            />
            <FilterCard
              label={t("stats.filters.language", "Language")}
              value={selectedLang}
              onValueChange={setSelectedLang}
              items={languageOptions}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="rounded-3xl border border-border/60 bg-card/50 p-5">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("stats.filteredCount", "Filtered library")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("stats.filteredCountDescription", "{{count}} titles visible", {
                      count: totalWatched,
                    })}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("stats.totalHours", "{{count}} hours total", {
                    count: Math.round(totalHours),
                  })}
                </p>
              </div>
              <div className="h-px bg-border/70" />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {t(
                  "stats.filterHint",
                  "These controls only affect the analysis below, not the underlying watch history.",
                )}
              </p>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card/50 p-5">
              <RadialProgressGauge
                value={totalHours}
                goal={bingeGoal}
                onGoalChange={setBingeGoal}
              />
            </div>
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("stats.genreDistribution", "Genre Distribution")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "stats.genreDistributionDesc",
                "Lazy-loaded charts keep the page responsive while the heavier visualization code loads only when needed.",
              )}
            </p>
          </div>

          {mediaLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
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
          ) : genreStats.length > 0 ? (
            <Suspense
              fallback={
                <div className="grid gap-6 md:grid-cols-2">
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
          ) : (
            <Card className="ct-panel">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {t(
                  "stats.noGenreData",
                  "Add more watched titles with genre metadata to unlock the breakdown.",
                )}
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
