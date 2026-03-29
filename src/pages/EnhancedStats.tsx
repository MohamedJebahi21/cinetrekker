  // Number of episodes watched (TV: number_of_episodes, Movie: 1)
  const totalEpisodes = useMemo(() => {
    return filteredMedia.reduce((sum, item) => {
      if (item.media_type === "tv") {
        return sum + (item.number_of_episodes ?? 1);
      }
      return sum + 1; // count each movie as 1 episode
    }, 0);
  }, [filteredMedia]);
import React, { useMemo, useState } from "react";
// import { supabase } from "@/integrations/supabase/client";
// import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useUserLists } from "@/contexts/UserListsContext";
import { Genre } from "@/types/media";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Star, Film } from "lucide-react";
import { GlassStatCard } from "@/components/GlassStatCard";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
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

function EnhancedStats() {
  // ── All hooks must come first, before any early returns ──

  const { watched } = useUserLists();
  const { i18n, t } = useTranslation();
  const language = i18n.language;

  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  type MediaTypeFilter = "all" | "movie" | "tv";
  const [selectedType, setSelectedType] = useState<MediaTypeFilter>("all");
  const [selectedLang, setSelectedLang] = useState<string>("all");

  const {
    data: mediaDetails,
    isLoading: mediaLoading,
    error: mediaError,
  } = useQuery({
    queryKey: [
      "enhanced-stats-details",
      watched.map((i) => `${i.mediaType}-${i.mediaId}`),
      language,
    ],
    queryFn: async () => {
      const { enrichMediaItems } = await import("@/lib/mediaEnrichment");
      return enrichMediaItems(watched, {
        language,
        getReference: (item) => item,
        mapExtras: (item) => ({
          userRating: item.rating,
          userNote: item.note,
          userStatus: item.status,
          watchedAt: item.watchedAt,
        }),
        logScope: "enhanced-stats",
      });
    },
    enabled: watched.length > 0,
  });

  const safeMediaDetails = useMemo(
    () => (Array.isArray(mediaDetails) ? mediaDetails : []),
    [mediaDetails]
  );

  const years = useMemo(() => {
    const allYears = safeMediaDetails
      .map((item) => {
        const date = item.watchedAt || item.addedAt || item.release_date || item.first_air_date;
        return date ? new Date(date).getFullYear() : null;
      })
      .filter((y): y is number => !!y);
    return Array.from(new Set(allYears)).sort((a, b) => b - a);
  }, [safeMediaDetails]);

  const languages = useMemo(() => {
    const all = safeMediaDetails
      .map((item) => item.original_language)
      .filter((l): l is string => !!l);
    return Array.from(new Set(all)).sort();
  }, [safeMediaDetails]);

  const filteredMedia = useMemo(() => {
    return safeMediaDetails.filter((item) => {
      if (selectedType !== "all" && item.media_type !== selectedType) return false;
      if (selectedLang !== "all" && item.original_language !== selectedLang) return false;
      if (selectedYear !== "all") {
        const date = item.watchedAt || item.addedAt || item.release_date || item.first_air_date;
        if (!date || new Date(date).getFullYear() !== selectedYear) return false;
      }
      return true;
    });
  }, [safeMediaDetails, selectedType, selectedLang, selectedYear]);

  const totalMovies = useMemo(
    () => filteredMedia.filter((i) => i.media_type === "movie").length,
    [filteredMedia]
  );
  const totalTV = useMemo(
    () => filteredMedia.filter((i) => i.media_type === "tv").length,
    [filteredMedia]
  );

  const totalHours = useMemo(() => {
    return filteredMedia.reduce((sum, item) => {
      const mins = item.media_type === "movie"
        ? (item.runtime ?? 0)
        : (item.episode_run_time?.[0] ?? item.runtime ?? 45) * (item.number_of_episodes ?? 1);
      return sum + mins / 60;
    }, 0);
  }, [filteredMedia]);

  const avgRating = useMemo(() => {
    const rated = filteredMedia.filter((i) => i.userRating);
    if (!rated.length) return 0;
    return rated.reduce((sum, i) => sum + (i.userRating ?? 0), 0) / rated.length;
  }, [filteredMedia]);

  const genreMap = useMemo(() => {
    const map = new Map<number, { name: string; count: number; hours: number }>();
    filteredMedia.forEach((item) => {
      const mins = item.media_type === "movie"
        ? (item.runtime ?? 0)
        : (item.episode_run_time?.[0] ?? item.runtime ?? 45) * (item.number_of_episodes ?? 1);
      (item.genres ?? []).forEach((g: Genre) => {
        const existing = map.get(g.id);
        if (existing) {
          existing.count += 1;
          existing.hours += mins / 60;
        } else {
          map.set(g.id, { name: g.name, count: 1, hours: mins / 60 });
        }
      });
    });
    return map;
  }, [filteredMedia]);

  const genreStats = useMemo(
    () =>
      Array.from(genreMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    [genreMap]
  );

  // ── Early returns AFTER all hooks ──

  if (mediaLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <span className="text-lg text-neutral-400">Loading stats...</span>
      </div>
    );
  }

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
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
            icon={Film}
            label={t("stats.totalTVShows", "Total TV Shows")}
            value={totalTV}
            description={t("stats.tvShowsWatched", "TV shows watched")}
            variant="primary"
            size="md"
            delay={0.05}
          />
          <GlassStatCard
            icon={Film}
            label={t("stats.episodesWatched", "Episodes Watched")}
            value={totalEpisodes}
            description={t("stats.episodesTotal", "Total episodes watched")}
            variant="primary"
            size="md"
            delay={0.1}
          />
          <GlassStatCard
            icon={Clock}
            label={t("stats.hoursWatched", "Hours Watched")}
            value={`${Math.round(totalHours)}h`}
            description={t("stats.daysTotal", "{{count}} days total", {
              count: Math.round(totalHours / 24),
            })}
            variant="success"
            size="md"
            delay={0.15}
          />
          <GlassStatCard
            icon={Star}
            label={t("stats.averageRating", "Average Rating")}
            value={avgRating.toFixed(1)}
            description={t("stats.outOfTen", "out of 10")}
            variant="warning"
            size="md"
            delay={0.2}
          />
        </div>
        <div className="min-w-[120px]">
          <label className="block text-xs font-semibold mb-1 text-neutral-400">Year</label>
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(v === "all" ? "all" : Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

          {/* Type Filter */}
          <div className="min-w-[120px]">
            <label className="block text-xs font-semibold mb-1 text-neutral-400">Type</label>
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as MediaTypeFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="movie">Movie</SelectItem>
                <SelectItem value="tv">TV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language Filter */}
          <div className="min-w-[120px]">
            <label className="block text-xs font-semibold mb-1 text-neutral-400">Language</label>
            <Select value={selectedLang} onValueChange={setSelectedLang}>
              <SelectTrigger>
                <SelectValue placeholder="All languages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <GlassStatCard
                      icon={Film}
                      label={t("stats.episodesWatched", "Episodes Watched")}
                      value={totalEpisodes}
                      description={t("stats.episodesTotal", "Total episodes watched")}
                      variant="info"
                      size="md"
                      delay={0.15}
                    />
          <GlassStatCard
            icon={Film}
            label={t("stats.totalWatched", "Total Watched")}
            value={filteredMedia.length}
            description={`${totalMovies} ${t("common.movies", "Movies").toLowerCase()}, ${totalTV} ${t("common.tvShows", "TV Shows").toLowerCase()}`}
            variant="primary"
            size="md"
            delay={0}
          />
          <GlassStatCard
            icon={Clock}
            label={t("stats.hoursWatched", "Hours Watched")}
            value={`${Math.round(totalHours)}h`}
            description={t("stats.daysTotal", "{{count}} days total", {
              count: Math.round(totalHours / 24),
            })}
            variant="success"
            size="md"
            delay={0.1}
          />
          <GlassStatCard
            icon={Star}
            label={t("stats.averageRating", "Average Rating")}
            value={avgRating.toFixed(1)}
            description={t("stats.outOfTen", "out of 10")}
            variant="warning"
            size="md"
            delay={0.2}
          />
        </div>

        {/* Genre Breakdown */}
        {genreStats.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>
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
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {genreStats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
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
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

export default EnhancedStats;