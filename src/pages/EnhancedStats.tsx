import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserLists } from "@/contexts/user-lists-context";
import { Genre } from "@/types/media";
import { getMovieDetails, getTVDetails } from "@/services/tmdb";
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
  Legend,
} from "recharts";
import { createFallbackMedia } from "@/lib/mediaFallback";

interface GenreStats {
  name: string;
  count: number;
  hours: number;
}

export default function EnhancedStats() {
  const { watched } = useUserLists();
  const { i18n, t } = useTranslation();
  const language = i18n.language;

  const { data: mediaDetails } = useQuery({
    queryKey: [
      "stats-details",
      watched.map((i) => `${i.mediaType}-${i.mediaId}`),
      language,
    ],
    queryFn: async () => {
      const results = await Promise.all(
        watched.map(async (item) => {
          try {
            const details =
              item.mediaType === "movie"
                ? await getMovieDetails(item.mediaId, language)
                : await getTVDetails(item.mediaId, language);
            return {
              ...details,
              media_type: item.mediaType,
              userRating: item.rating,
              watchedAt: item.watchedAt || item.addedAt,
            };
          } catch {
            return createFallbackMedia(item, {
              userRating: item.rating,
              watchedAt: item.watchedAt || item.addedAt,
            });
          }
        }),
      );
      return results;
    },
    enabled: watched.length > 0,
  });

  // Calculate stats
  const totalMovies =
    mediaDetails?.filter((m) => m.media_type === "movie").length || 0;
  const totalTV =
    mediaDetails?.filter((m) => m.media_type === "tv").length || 0;

  const totalHours =
    mediaDetails?.reduce((acc, item) => {
      const runtime =
        item.runtime ||
        (item.episode_run_time && item.episode_run_time[0]) ||
        0;
      const episodes =
        item.media_type === "tv" ? item.number_of_episodes || 1 : 1;
      return acc + (runtime * episodes) / 60;
    }, 0) || 0;

  const avgRating =
    mediaDetails && mediaDetails.length > 0
      ? mediaDetails.reduce((acc, item) => acc + (item.vote_average || 0), 0) /
        mediaDetails.length
      : 0;

  // Genre breakdown
  const genreMap = new Map<
    number,
    { name: string; count: number; hours: number }
  >();
  mediaDetails?.forEach((item) => {
    const runtime =
      item.runtime || (item.episode_run_time && item.episode_run_time[0]) || 0;
    const episodes =
      item.media_type === "tv" ? item.number_of_episodes || 1 : 1;
    const hours = (runtime * episodes) / 60;

    item.genres?.forEach((genre: Genre) => {
      const existing = genreMap.get(genre.id) || {
        name: genre.name,
        count: 0,
        hours: 0,
      };
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

  // Pie chart colors
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

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <GlassStatCard
            icon={Film}
            label={t("stats.totalWatched", "Total Watched")}
            value={watched.length}
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
