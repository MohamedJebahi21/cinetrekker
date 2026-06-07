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
  const { watched } = useUserLists();
  const { i18n } = useTranslation();
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

  const { data: mediaDetails } = useQuery({
    queryKey: ['stats-details', watched.map((i) => `${i.mediaType}-${i.mediaId}`), language],
    queryFn: async () => {
      const results = await Promise.all(
        watched.map(async (item) => {
          try {
            const details =
              item.mediaType === 'movie'
                ? await getMovieDetails(item.mediaId, language)
                : await getTVDetails(item.mediaId, language);
            return { ...details, media_type: item.mediaType, userRating: item.rating, watchedAt: item.addedAt };
          } catch {
            return null;
          }
        })
      );
      return results.filter(Boolean);
    },
    enabled: watched.length > 0,
  });

  // Calculate stats
  const totalMovies = mediaDetails?.filter((m) => m.media_type === 'movie').length || 0;
  const totalTV = mediaDetails?.filter((m) => m.media_type === 'tv').length || 0;

  const totalHours =
    mediaDetails?.reduce((acc, item) => {
      const runtime = item.runtime || (item.episode_run_time && item.episode_run_time[0]) || 0;
      const episodes = item.media_type === 'tv' ? (item.number_of_episodes || 1) : 1;
      return acc + (runtime * episodes) / 60;
    }, 0) || 0;

  const avgRating =
    mediaDetails && mediaDetails.length > 0
      ? mediaDetails.reduce((acc, item) => acc + (item.vote_average || 0), 0) / mediaDetails.length
      : 0;

  // Genre breakdown
  const genreMap = new Map<number, { name: string; count: number; hours: number }>();
  mediaDetails?.forEach((item) => {
    const runtime = item.runtime || (item.episode_run_time && item.episode_run_time[0]) || 0;
    const episodes = item.media_type === 'tv' ? (item.number_of_episodes || 1) : 1;
    const hours = (runtime * episodes) / 60;

    item.genres?.forEach((genre: Genre) => {
      const existing = genreMap.get(genre.id) || { name: genre.name, count: 0, hours: 0 };
      genreMap.set(genre.id, {
        name: genre.name,
        count: existing.count + 1,
        hours: existing.hours + hours,
      });
    });
  });

  const genreStats = Array.from(genreMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Calculate watching streak
  const sortedWatched = [...watched].sort(
    (a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime()
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  sortedWatched.forEach((item) => {
    const itemDate = new Date(item.addedAt || 0);
    itemDate.setHours(0, 0, 0, 0);

    if (!lastDate) {
      tempStreak = 1;
    } else {
      const dayDiff = Math.floor((lastDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) {
        tempStreak++;
      } else if (dayDiff > 1) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    lastDate = itemDate;
  });

  longestStreak = Math.max(longestStreak, tempStreak);

  // Check if watching recently for current streak
  if (sortedWatched.length > 0) {
    const mostRecent = new Date(sortedWatched[0].addedAt || 0);
    const today = new Date();
    const daysSinceLastWatch = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastWatch <= 1) {
      currentStreak = tempStreak;
    }
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

  return (
    <>
      <SEO
        title="Enhanced Stats — CineTrekker"
        description="View detailed statistics about your watching habits"
        canonical="https://cinetrekker.vercel.app/stats"
      />
      <div className="page-container pt-20 pb-24 md:pb-0">
        <h1 className="section-title">Your Stats</h1>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <GlassStatCard
            icon={Film}
            label="Total Watched"
            value={watched.length}
            description={`${totalMovies} movies, ${totalTV} shows`}
            variant="primary"
            size="md"
            delay={0}
          />

          <GlassStatCard
            icon={Clock}
            label="Hours Watched"
            value={`${Math.round(totalHours)}h`}
            description={`${Math.round(totalHours / 24)} days total`}
            variant="success"
            size="md"
            delay={0.1}
          />

          <GlassStatCard
            icon={Star}
            label="Average Rating"
            value={avgRating.toFixed(1)}
            description="out of 10"
            variant="warning"
            size="md"
            delay={0.2}
          />

          <GlassStatCard
            icon={Flame}
            label="Current Streak"
            value={`${currentStreak} days`}
            description={`Longest: ${longestStreak} days`}
            variant="danger"
            size="md"
            delay={0.3}
          />
        </div>

        {/* Genre Breakdown */}
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
    </>
  );
}
