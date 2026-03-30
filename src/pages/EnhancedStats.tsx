import { useTranslation } from "react-i18next";
import { Clock, Film, Star, Tv } from "lucide-react";
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
import { useEnhancedStatsData } from "@/hooks/useEnhancedStatsData";

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

export default function EnhancedStats() {
  const { i18n, t } = useTranslation();
  const language = i18n.language;
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

        <div className="ct-toolbar justify-center">
          <div className="ct-filter-field">
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

          <div className="ct-filter-field">
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

          <div className="ct-filter-field">
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
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="ct-panel">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">
                  {t("stats.genreDistribution", "Genre Distribution")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genreStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name} (${entry.count})`}
                      outerRadius={90}
                      dataKey="count"
                    >
                      {genreStats.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={
                            CINEMATIC_CHART_COLORS[
                              index % CINEMATIC_CHART_COLORS.length
                            ]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "rgba(22,22,22,0.95)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#fff",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="ct-panel">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">
                  {t("stats.hoursByGenre", "Hours by Genre")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={genreStats}>
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      stroke="#a3a3a3"
                      tick={{ fill: "#d4d4d8", fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#a3a3a3"
                      tick={{ fill: "#d4d4d8", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(22,22,22,0.95)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="hours" fill="#E50914" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
