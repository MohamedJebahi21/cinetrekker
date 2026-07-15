import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Clock,
  Film,
  Star,
  Tv,
  Award,
  BarChart2,
  History,
  Search,
  Sparkles,
  Flame,
  Calendar,
  Layers,
  ArrowRight,
  HelpCircle,
  Play,
  Heart,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GlassStatCard } from "@/components/GlassStatCard";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useEnhancedStatsData, type MediaTypeFilter } from "@/hooks/useEnhancedStatsData";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Image } from "@/components/ui/Image";
import { getImageUrl, getBackdropUrl } from "@/services/tmdb";
import {
  getEnrichedMediaType,
  getEnrichedMediaLanguage,
  getEnrichedMediaDate,
  getEnrichedMediaYear,
} from "@/types/enriched-media";
import { cn } from "@/lib/utils";

const CINEMATIC_CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--rating-medium))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--primary) / 0.72)",
  "hsl(var(--rating-medium) / 0.72)",
  "hsl(var(--success) / 0.72)",
];

export default function EnhancedStats() {
  const { i18n, t } = useTranslation();
  const isMobile = useIsMobile();
  const language = i18n.language;

  // Tabs state
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Search state inside History list
  const [historySearch, setHistorySearch] = useState<string>("");

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

  // 1. Ratings Distribution Stats
  const ratingsStats = useMemo(() => {
    const counts = Array.from({ length: 10 }, (_, i) => ({ name: `${i + 1} ★`, count: 0 }));
    filteredMedia.forEach((item) => {
      if (item.userRating && item.userRating >= 1 && item.userRating <= 10) {
        counts[item.userRating - 1].count += 1;
      }
    });
    return counts;
  }, [filteredMedia]);

  // 2. Decade Breakdown Stats
  const decadesStats = useMemo(() => {
    const decadesMap = new Map<string, number>();
    filteredMedia.forEach((item) => {
      const dateStr = item.release_date || item.first_air_date || item.releaseDate || item.firstAirDate;
      if (dateStr) {
        const year = new Date(dateStr).getFullYear();
        if (year) {
          const decadeStart = Math.floor(year / 10) * 10;
          let decadeLabel = `${decadeStart}s`;
          if (decadeStart >= 2000) {
            decadeLabel = `'${decadeStart.toString().slice(-2)}s`;
          }
          decadesMap.set(decadeLabel, (decadesMap.get(decadeLabel) || 0) + 1);
        }
      }
    });

    const parsedDecadeSort = (d: string) => {
      if (d.startsWith("'")) {
        return parseInt(d.slice(1, -1)) + 2000;
      }
      return parseInt(d.slice(0, -1));
    };

    return Array.from(decadesMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => parsedDecadeSort(a.name) - parsedDecadeSort(b.name));
  }, [filteredMedia]);

  // 3. Monthly Activity Trend
  const monthlyStats = useMemo(() => {
    const months = [
      t("months.jan", "Jan"),
      t("months.feb", "Feb"),
      t("months.mar", "Mar"),
      t("months.apr", "Apr"),
      t("months.may", "May"),
      t("months.jun", "Jun"),
      t("months.jul", "Jul"),
      t("months.aug", "Aug"),
      t("months.sep", "Sep"),
      t("months.oct", "Oct"),
      t("months.nov", "Nov"),
      t("months.dec", "Dec"),
    ];
    const data = months.map((m) => ({ name: m, count: 0, hours: 0 }));

    filteredMedia.forEach((item) => {
      const dateStr = item.watchedAt || item.addedAt;
      if (dateStr) {
        const date = new Date(dateStr);
        const monthIdx = date.getMonth();
        if (monthIdx >= 0 && monthIdx < 12) {
          const minutes =
            getEnrichedMediaType(item) === "movie"
              ? item.runtime ?? 0
              : (item.episode_run_time?.[0] ?? item.runtime ?? 45) *
                (item.number_of_episodes ?? 1);
          data[monthIdx].count += 1;
          data[monthIdx].hours += parseFloat((minutes / 60).toFixed(1));
        }
      }
    });

    return data.map((d) => ({
      ...d,
      hours: Math.round(d.hours),
    }));
  }, [filteredMedia, t]);

  // 4. Rating Highlights
  const userRatedMedia = useMemo(() => {
    return filteredMedia.filter((m) => m.userRating !== undefined && m.userRating > 0);
  }, [filteredMedia]);

  const avgUserRating = useMemo(() => {
    if (userRatedMedia.length === 0) return null;
    return (
      userRatedMedia.reduce((sum, m) => sum + (m.userRating || 0), 0) / userRatedMedia.length
    ).toFixed(1);
  }, [userRatedMedia]);

  const avgTmdbRating = useMemo(() => {
    if (userRatedMedia.length === 0) return null;
    return (
      userRatedMedia.reduce((sum, m) => sum + (m.vote_average || 0), 0) / userRatedMedia.length
    ).toFixed(1);
  }, [userRatedMedia]);

  const ratingDifference = useMemo(() => {
    if (!avgUserRating || !avgTmdbRating) return null;
    const diff = parseFloat(avgUserRating) - parseFloat(avgTmdbRating);
    return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  }, [avgUserRating, avgTmdbRating]);

  // 5. Rankings Leaderboards (Top Rated)
  const topMovies = useMemo(() => {
    return [...filteredMedia]
      .filter((m) => getEnrichedMediaType(m) === "movie" && m.userRating)
      .sort(
        (a, b) =>
          (b.userRating || 0) - (a.userRating || 0) || (b.vote_average || 0) - (a.vote_average || 0)
      )
      .slice(0, 5);
  }, [filteredMedia]);

  const topTVShows = useMemo(() => {
    return [...filteredMedia]
      .filter((m) => getEnrichedMediaType(m) === "tv" && m.userRating)
      .sort(
        (a, b) =>
          (b.userRating || 0) - (a.userRating || 0) || (b.vote_average || 0) - (a.vote_average || 0)
      )
      .slice(0, 5);
  }, [filteredMedia]);

  // 6. Filtered History List
  const searchedHistoryMedia = useMemo(() => {
    return filteredMedia.filter((item) => {
      const title = item.title || item.name || "";
      return title.toLowerCase().includes(historySearch.toLowerCase());
    });
  }, [filteredMedia, historySearch]);

  if (mediaLoading) {
    return (
      <div className="page-container flex min-h-[40vh] items-center justify-center pt-28">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm font-semibold text-muted-foreground">Analyzing dashboard statistics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ct-page-shell min-h-screen">
      <div className="page-container w-full max-w-6xl space-y-8 pt-20 pb-24 md:pb-12">
        
        {/* Cinematic Header Block */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="ct-panel flex shrink-0 items-center justify-center rounded-2xl p-3 bg-primary/10 border-primary/20">
              <Award className="w-8 h-8 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="ct-kicker mb-1">Cinephile Dashboard</p>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Analytics & Insights
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Deep stats overview of your movie logs and series habits.
              </p>
            </div>
          </div>

          {/* Filtering controls inside main header bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Year selector */}
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(value === "all" ? "all" : Number(value))}
            >
              <SelectTrigger className="w-28 rounded-2xl border-border/50 bg-card/60 text-foreground">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 bg-popover/95 backdrop-blur-sm">
                <SelectItem value="all">All Years</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type selector */}
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as MediaTypeFilter)}
            >
              <SelectTrigger className="w-28 rounded-2xl border-border/50 bg-card/60 text-foreground">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 bg-popover/95 backdrop-blur-sm">
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="movie">Movies</SelectItem>
                <SelectItem value="tv">TV Shows</SelectItem>
              </SelectContent>
            </Select>

            {/* Language selector */}
            <Select value={selectedLang} onValueChange={setSelectedLang}>
              <SelectTrigger className="w-32 rounded-2xl border-border/50 bg-card/60 text-foreground">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 bg-popover/95 backdrop-blur-sm">
                <SelectItem value="all">Languages</SelectItem>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dashboard Tabs switcher */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 rounded-2xl border border-border/40 bg-card/40 p-1 backdrop-blur-sm max-w-2xl">
            <TabsTrigger value="overview" className="rounded-xl flex items-center gap-1.5 py-2 text-xs font-bold">
              <BarChart2 className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="taste" className="rounded-xl flex items-center gap-1.5 py-2 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              Taste & Era
            </TabsTrigger>
            <TabsTrigger value="rankings" className="rounded-xl flex items-center gap-1.5 py-2 text-xs font-bold">
              <Star className="h-3.5 w-3.5" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl flex items-center gap-1.5 py-2 text-xs font-bold">
              <History className="h-3.5 w-3.5" />
              History List
            </TabsTrigger>
          </TabsList>

          {/* ────────────────── Overview Tab ────────────────── */}
          <TabsContent value="overview" className="space-y-6 outline-none">
            {/* Top Watchtime Snapshot Panel */}
            <div className="ct-panel relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 p-6 md:p-8 backdrop-blur-md shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(229,9,20,0.08),transparent_60%)]" />
              <div className="relative z-10 space-y-2 text-center md:text-left">
                <p className="text-xs font-black uppercase tracking-widest text-primary flex items-center justify-center md:justify-start gap-1">
                  <Flame className="h-4.5 w-4.5 fill-current animate-pulse" />
                  Screen Time Summary
                </p>
                <h2 className="text-xl font-black text-foreground">Annual Watch Time</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  A comprehensive breakdown of hours spent watching movies and episodes within the selected filters.
                </p>
              </div>

              <div className="relative z-10 flex flex-col items-center shrink-0 border border-border/40 bg-background/50 px-8 py-5 rounded-2xl backdrop-blur-sm min-w-[180px]">
                <Clock className="h-8 w-8 text-primary mb-2 drop-shadow-md" />
                <div className="text-5xl font-black tracking-tight text-foreground tabular-nums">
                  {Math.round(totalHours)}
                  <span className="align-super text-lg font-bold text-primary ml-0.5">h</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-bold">
                  {t("stats.daysTotal", "{{count}} days total", {
                    count: Math.round(totalHours / 24),
                  })}
                </div>
              </div>
            </div>

            {/* Quick Stat Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <GlassStatCard
                icon={Film}
                label={t("stats.totalMovies", "Total Movies")}
                value={totalMovies}
                description={t("stats.moviesWatched", "Movies logged")}
                variant="primary"
                size="md"
                delay={0}
              />
              <GlassStatCard
                icon={Tv}
                label={t("stats.totalTVShows", "Total TV Shows")}
                value={totalTV}
                description={t("stats.tvShowsWatched", "TV shows followed")}
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
                description={`${totalMovies} movies, ${totalTV} series`}
                variant="success"
                size="md"
                delay={0.15}
              />
            </div>

            {/* Overview Charts Grid */}
            {filteredMedia.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {/* 1. Monthly activity area trend */}
                <Card className="ct-panel overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                      <Calendar className="h-4.5 w-4.5 text-primary" />
                      Monthly Watch Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                      <AreaChart data={monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="name"
                          stroke="hsl(var(--border))"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <YAxis
                          stroke="hsl(var(--border))"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            color: "hsl(var(--popover-foreground))",
                            borderRadius: "var(--radius)",
                            fontSize: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="hours"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorHours)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 2. Genre Distribution Pie chart */}
                {genreStats.length > 0 && (
                  <Card className="ct-panel overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                        <Layers className="h-4.5 w-4.5 text-primary" />
                        Genre Share Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-6">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <ResponsiveContainer width="100%" height={220} className="sm:max-w-[200px]">
                          <PieChart>
                            <Pie
                              data={genreStats}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={75}
                              dataKey="count"
                            >
                              {genreStats.map((entry, index) => (
                                <Cell
                                  key={`cell-${entry.name}`}
                                  fill={CINEMATIC_CHART_COLORS[index % CINEMATIC_CHART_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                color: "hsl(var(--popover-foreground))",
                                borderRadius: "var(--radius)",
                                fontSize: "12px",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>

                        {/* Custom Legends list */}
                        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-xs w-full">
                          {genreStats.map((genre, idx) => (
                            <div key={genre.name} className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full shrink-0"
                                style={{ backgroundColor: CINEMATIC_CHART_COLORS[idx % CINEMATIC_CHART_COLORS.length] }}
                              />
                              <span className="truncate font-semibold text-foreground/95">{genre.name}</span>
                              <span className="text-muted-foreground/60 ml-auto">{genre.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="ct-panel p-16 text-center border-dashed border-border/80">
                <BarChart2 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-bold">No Viewing Data Yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Log some movies and TV shows as watched to see analytics.
                </p>
              </div>
            )}

            {/* 3. Hours by genre bar chart */}
            {genreStats.length > 0 && (
              <Card className="ct-panel overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base font-black tracking-tight text-foreground">
                    Hours Logged by Genre Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-6">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={genreStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--border))"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      />
                      <YAxis
                        stroke="hsl(var(--border))"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          color: "hsl(var(--popover-foreground))",
                          borderRadius: "var(--radius)",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ────────────────── Taste & Era Tab ────────────────── */}
          <TabsContent value="taste" className="space-y-6 outline-none">
            {/* Average Rating & comparison grid */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Highlight Card 1: Avg User Rating */}
              <div className="ct-panel bg-card/50 backdrop-blur-sm border-border/50 p-5 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Average User Rating
                  </span>
                  <div className="text-3xl font-black text-foreground">
                    {avgUserRating ? `${avgUserRating} ★` : "N/A"}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">
                    From {userRatedMedia.length} rated titles
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                  <Star className="h-6 w-6 fill-current" />
                </div>
              </div>

              {/* Highlight Card 2: TMDB rating comparison */}
              <div className="ct-panel bg-card/50 backdrop-blur-sm border-border/50 p-5 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    vs Global Community
                  </span>
                  <div className={cn(
                    "text-3xl font-black",
                    ratingDifference && parseFloat(ratingDifference) > 0 ? "text-emerald-500" : "text-amber-500"
                  )}>
                    {ratingDifference ? `${ratingDifference} pts` : "N/A"}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">
                    Compared to TMDB global averages
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shrink-0">
                  <Award className="h-6 w-6" />
                </div>
              </div>

              {/* Highlight Card 3: Genre archetypes match */}
              <div className="ct-panel bg-card/50 backdrop-blur-sm border-border/50 p-5 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Top Genre Preference
                  </span>
                  <div className="text-2xl font-black text-foreground truncate max-w-[160px]">
                    {genreStats[0]?.name || "N/A"}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">
                    {genreStats[0] ? `${Math.round(genreStats[0].hours)} hours logged` : "No preference"}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                  <Flame className="h-6 w-6 fill-current" />
                </div>
              </div>
            </div>

            {/* Era & Decades Distribution charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Decades Distribution */}
              {decadesStats.length > 0 ? (
                <Card className="ct-panel overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                      <Calendar className="h-4.5 w-4.5 text-primary" />
                      Release Decades Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={decadesStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis
                          dataKey="name"
                          stroke="hsl(var(--border))"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <YAxis
                          stroke="hsl(var(--border))"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            color: "hsl(var(--popover-foreground))",
                            borderRadius: "var(--radius)",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--rating-medium))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <Card className="ct-panel flex items-center justify-center py-20 text-center opacity-30">
                  <p className="text-sm font-semibold">No release dates available</p>
                </Card>
              )}

              {/* User Ratings Distribution Histogram */}
              {userRatedMedia.length > 0 ? (
                <Card className="ct-panel overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                      <Star className="h-4.5 w-4.5 text-primary" />
                      User Ratings Histogram
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={ratingsStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis
                          dataKey="name"
                          stroke="hsl(var(--border))"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <YAxis
                          stroke="hsl(var(--border))"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            color: "hsl(var(--popover-foreground))",
                            borderRadius: "var(--radius)",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <Card className="ct-panel flex flex-col items-center justify-center py-20 text-center text-muted-foreground border-dashed border-border/60">
                  <Star className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-semibold">No Rated Titles</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                    Give ratings to your logged items to generate a rating breakdown.
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ────────────────── Rankings Leaderboard Tab ────────────────── */}
          <TabsContent value="rankings" className="space-y-6 outline-none">
            <div className="grid gap-8 md:grid-cols-2">
              
              {/* 1. Top Movies Leaderboard */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <Film className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-black tracking-tight text-foreground">Top Rated Movies</h3>
                </div>

                <div className="space-y-3">
                  {topMovies.length > 0 ? (
                    topMovies.map((item, idx) => (
                      <Link
                        key={item.id}
                        to={`/movie/${item.id}`}
                        className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-3 transition duration-300 hover:border-primary/40 hover:shadow-md"
                      >
                        {/* Rank Badge */}
                        <div className={cn(
                          "h-8 w-8 rounded-full shrink-0 flex items-center justify-center font-black text-xs border shadow-sm",
                          idx === 0 ? "bg-amber-500/20 border-amber-500 text-amber-500 shadow-amber-500/10" :
                          idx === 1 ? "bg-zinc-400/20 border-zinc-400 text-zinc-400" :
                          idx === 2 ? "bg-amber-800/20 border-amber-800 text-amber-600" :
                          "bg-muted border-border text-muted-foreground"
                        )}>
                          #{idx + 1}
                        </div>

                        {/* Poster */}
                        <div className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded-lg border border-border/40">
                          <Image
                            src={getImageUrl(item.poster_path, 'w92')}
                            alt=""
                            width={92}
                            height={138}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>

                        {/* Title & info */}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <h4 className="font-bold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {item.release_date ? new Date(item.release_date).getFullYear() : "N/A"}
                          </p>
                        </div>

                        {/* Rating block */}
                        <div className="shrink-0 flex flex-col items-end gap-0.5">
                          <div className="inline-flex items-center gap-1 rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-black text-primary">
                            <Star className="h-3 w-3 fill-current" />
                            {item.userRating}
                          </div>
                          {item.vote_average > 0 && (
                            <span className="text-[9px] text-muted-foreground">
                              TMDB: {item.vote_average.toFixed(1)}
                            </span>
                          )}
                        </div>

                      </Link>
                    ))
                  ) : (
                    <div className="ct-panel p-10 text-center opacity-30">
                      <p className="text-sm font-semibold">No rated movies logged</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Top TV Shows Leaderboard */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <Tv className="h-5 w-5 text-amber-500" />
                  <h3 className="text-lg font-black tracking-tight text-foreground">Top Rated TV Shows</h3>
                </div>

                <div className="space-y-3">
                  {topTVShows.length > 0 ? (
                    topTVShows.map((item, idx) => (
                      <Link
                        key={item.id}
                        to={`/tv/${item.id}`}
                        className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-3 transition duration-300 hover:border-primary/40 hover:shadow-md"
                      >
                        {/* Rank Badge */}
                        <div className={cn(
                          "h-8 w-8 rounded-full shrink-0 flex items-center justify-center font-black text-xs border shadow-sm",
                          idx === 0 ? "bg-amber-500/20 border-amber-500 text-amber-500 shadow-amber-500/10" :
                          idx === 1 ? "bg-zinc-400/20 border-zinc-400 text-zinc-400" :
                          idx === 2 ? "bg-amber-800/20 border-amber-800 text-amber-600" :
                          "bg-muted border-border text-muted-foreground"
                        )}>
                          #{idx + 1}
                        </div>

                        {/* Poster */}
                        <div className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded-lg border border-border/40">
                          <Image
                            src={getImageUrl(item.poster_path, 'w92')}
                            alt=""
                            width={92}
                            height={138}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>

                        {/* Title & info */}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <h4 className="font-bold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                            {item.name || item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {item.first_air_date ? new Date(item.first_air_date).getFullYear() : "N/A"}
                          </p>
                        </div>

                        {/* Rating block */}
                        <div className="shrink-0 flex flex-col items-end gap-0.5">
                          <div className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-black text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            {item.userRating}
                          </div>
                          {item.vote_average > 0 && (
                            <span className="text-[9px] text-muted-foreground">
                              TMDB: {item.vote_average.toFixed(1)}
                            </span>
                          )}
                        </div>

                      </Link>
                    ))
                  ) : (
                    <div className="ct-panel p-10 text-center opacity-30">
                      <p className="text-sm font-semibold">No rated series logged</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </TabsContent>

          {/* ────────────────── History List Tab ────────────────── */}
          <TabsContent value="history" className="space-y-6 outline-none">
            {/* Search toolbar */}
            <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search watched history..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-9 rounded-2xl bg-card/60 border-border/50 focus-visible:ring-primary/40 focus:border-primary/50"
                />
              </div>

              <div className="text-xs font-semibold text-muted-foreground shrink-0">
                {searchedHistoryMedia.length} of {filteredMedia.length} logged
              </div>
            </div>

            {/* History Grid List */}
            {searchedHistoryMedia.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {searchedHistoryMedia.map((item) => {
                  const itemType = getEnrichedMediaType(item);
                  const isMovie = itemType === "movie";
                  const dateStr = getEnrichedMediaDate(item);

                  return (
                    <div
                      key={item.id}
                      className="group flex items-center gap-3.5 rounded-2xl border border-border/50 bg-card/60 p-3 transition duration-300 hover:border-primary/30 hover:shadow-md"
                    >
                      {/* Poster image */}
                      <div className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-xl border border-border/40">
                        <Image
                          src={getImageUrl(item.poster_path, 'w92')}
                          alt=""
                          width={92}
                          height={138}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>

                      {/* Details block */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Badge className={cn(
                            "px-1 py-0.5 text-[8px] font-bold leading-none border-0",
                            isMovie ? "bg-primary" : "bg-amber-500 text-black"
                          )}>
                            {isMovie ? "Movie" : "TV"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {dateStr ? format(new Date(dateStr), "MMM d, yyyy") : ""}
                          </span>
                        </div>

                        <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                          {item.title || item.name}
                        </h4>

                        <p className="text-[9px] text-muted-foreground truncate">
                          Language: {item.original_language?.toUpperCase() || "N/A"}
                        </p>
                      </div>

                      {/* Ratings Overlay & click detail link */}
                      <div className="flex flex-col items-end justify-between h-full gap-2 shrink-0">
                        <div className="inline-flex items-center gap-0.5 text-[10px] font-black text-foreground">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {item.userRating ? `${item.userRating}/10` : "—"}
                        </div>

                        <Link
                          to={`/${isMovie ? "movie" : "tv"}/${item.id}`}
                          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                        >
                          View
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="ct-panel py-16 text-center border-dashed border-border/80">
                <Search className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-base font-bold">No History Items Found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  No matches found for "{historySearch}". Try clearing your search query.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
