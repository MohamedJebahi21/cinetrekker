import React, { useMemo, useState } from "react";
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
      let mins = 0;
      if (item.media_type === "movie") {
        mins = item.runtime || 0;
      } else if (item.media_type === "tv") {
        mins = (item.episode_run_time?.[0] ?? 45) * (item.number_of_episodes ?? 1);
      }
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
      let mins = 0;
      if (item.media_type === "movie") {
        mins = item.runtime || 0;
      } else if (item.media_type === "tv") {
        mins = (item.episode_run_time?.[0] ?? 45) * (item.number_of_episodes ?? 1);
      }
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

  if (mediaError) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-red-700 text-white px-6 py-4 rounded-lg shadow">
          <div className="font-bold mb-2">Failed to load stats</div>
          <div className="text-sm break-all">{String(mediaError)}</div>
        </div>
      </div>
    );
  }

  // ── Pie chart colors ──
  const COLORS = [
    "#8b5cf6",
    "#ec4899",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#6366f1",
    "#14b8a6",
  ];

  return (
    <>
      <SEO
        title={t("stats.enhancedSeoTitle", "Enhanced Stats - CineTrekker")}
        description={t(
          "stats.enhancedSeoDescription",
          "View detailed statistics about your watching habits",
        )}
        canonical="https://cinetrekker.vercel.app/enhanced-stats"
      />
      <div className="page-container pt-20 pb-24 md:pb-0">
        <h1 className="section-title">{t("stats.yourStats", "Your Stats")}</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8 items-end">
          {/* Year Filter */}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
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