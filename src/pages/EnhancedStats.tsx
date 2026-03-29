
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserLists } from "@/contexts/UserListsContext";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
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

// Midnight palette for charts
const MIDNIGHT_COLORS = [
  "#0f172a", // deep blue
  "#312e81", // indigo
  "#06b6d4", // teal
  "#7c3aed", // purple
  "#0ea5e9", // blue
  "#818cf8", // light indigo
  "#334155", // slate
  "#64748b", // gray blue
];

function EnhancedStats() {
  // Data logic (unchanged)
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
    return Math.round(
      filteredMedia.reduce((sum, item) => {
        const mins = item.media_type === "movie"
          ? (item.runtime ?? 0)
          : (item.episode_run_time?.[0] ?? item.runtime ?? 45) * (item.number_of_episodes ?? 1);
        return sum + (mins || 0) / 60;
      }, 0)
    );
  }, [filteredMedia]);
  const genreStats = useMemo(() => {
    const map = new Map();
    filteredMedia.forEach((item) => {
      if (!item.genres) return;
      item.genres.forEach((g) => {
        if (!map.has(g.name)) map.set(g.name, { name: g.name, count: 0, hours: 0 });
        map.get(g.name).count++;
        const mins = item.media_type === "movie"
          ? (item.runtime ?? 0)
          : (item.episode_run_time?.[0] ?? item.runtime ?? 45) * (item.number_of_episodes ?? 1);
        map.get(g.name).hours += (mins || 0) / 60;
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredMedia]);

  // --- UI ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#18181b] via-[#232946] to-[#0f172a] font-sans text-white px-4 py-10">
      {/* Hero Stat */}
      <section className="flex flex-col items-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">
          {t("yourStats", "Your Stats")}
        </h1>
        <div className="mt-6 mb-2">
          <span
            className="block text-center text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_24px_rgba(255,200,80,0.25)]"
            style={{
              textShadow: "0 0 32px #fbbf24, 0 0 8px #fde68a",
              letterSpacing: "-0.03em",
            }}
          >
            {Math.round(totalHours)}h
          </span>
          <div className="text-lg md:text-xl font-medium text-amber-100/80">
            {t("hoursWatched", "Total Hours Watched")}
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 justify-center mb-10">
        <div>
          <label className="block text-xs font-semibold mb-1 text-neutral-400">Year</label>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(v === "all" ? "all" : Number(v))}>
            <SelectTrigger className="rounded-full px-4 py-2 bg-white/5 border border-white/10 backdrop-blur-md text-white focus:ring-2 focus:ring-amber-400">
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
        <div>
          <label className="block text-xs font-semibold mb-1 text-neutral-400">Type</label>
          <Select value={selectedType} onValueChange={(v) => setSelectedType(v as MediaTypeFilter)}>
            <SelectTrigger className="rounded-full px-4 py-2 bg-white/5 border border-white/10 backdrop-blur-md text-white focus:ring-2 focus:ring-amber-400">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="movie">Movies</SelectItem>
              <SelectItem value="tv">TV Shows</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-neutral-400">Language</label>
          <Select value={selectedLang} onValueChange={setSelectedLang}>
            <SelectTrigger className="rounded-full px-4 py-2 bg-white/5 border border-white/10 backdrop-blur-md text-white focus:ring-2 focus:ring-amber-400">
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {[
          {
            label: t("totalWatched", "Total Watched"),
            value: totalMovies + totalTV,
            desc: t("movies", "Movies") + " / " + t("tvShows", "TV Shows"),
            icon: (
              <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
            ),
          },
          {
            label: t("movies", "Movies"),
            value: totalMovies,
            desc: t("totalWatched", "Total Watched"),
            icon: (
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /></svg>
            ),
          },
          {
            label: t("tvShows", "TV Shows"),
            value: totalTV,
            desc: t("totalWatched", "Total Watched"),
            icon: (
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="13" rx="3" /><rect x="7" y="2" width="10" height="3" rx="1" /></svg>
            ),
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -8, boxShadow: "0 8px 32px 0 rgba(16,16,32,0.25)" }}
            className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md transition-all duration-200 shadow-lg flex flex-col items-center"
          >
            <div className="mb-2">{stat.icon}</div>
            <div className="text-4xl font-extrabold text-white drop-shadow">{stat.value}</div>
            <div className="text-base font-medium text-neutral-300">{stat.label}</div>
            <div className="text-xs text-neutral-500 mt-1">{stat.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Doughnut Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-lg">
          <h2 className="text-lg font-bold mb-4 text-white">{t("genreDistribution", "Genre Distribution")}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={genreStats}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={48}
                paddingAngle={2}
                startAngle={90}
                endAngle={450}
                stroke="none"
              >
                {genreStats.map((entry, idx) => (
                  <Cell key={entry.name} fill={MIDNIGHT_COLORS[idx % MIDNIGHT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#232946",
                  border: "1px solid #334155",
                  color: "#fff",
                  borderRadius: "0.75rem",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Horizontal Bar Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-lg">
          <h2 className="text-lg font-bold mb-4 text-white">{t("hoursByGenre", "Hours by Genre")}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={genreStats}
              layout="vertical"
              margin={{ left: 40, right: 20, top: 10, bottom: 10 }}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fill: "#fff", fontSize: 14, fontWeight: 600 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#232946",
                  border: "1px solid #334155",
                  color: "#fff",
                  borderRadius: "0.75rem",
                }}
              />
              <Bar
                dataKey="hours"
                fill="#06b6d4"
                radius={[12, 12, 12, 12]}
                barSize={18}
                label={{ position: "right", fill: "#fff", fontWeight: 700 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

  const totalEpisodes = useMemo(() => {
    return filteredMedia.reduce((sum, item) => {
      if (item.media_type === "tv") {
        return sum + (item.number_of_episodes ?? 1);
      }
      return sum + 1; // count each movie as 1 episode
    }, 0);
  }, [filteredMedia]);

  const totalHours = useMemo(() => {
    return filteredMedia.reduce((sum, item) => {
      const mins =
        item.media_type === "movie"
          ? item.runtime ?? 0
          : (item.episode_run_time?.[0] ?? item.runtime ?? 45) * (item.number_of_episodes ?? 1);
      return sum + mins / 60;
    }, 0);
  }, [filteredMedia]);

  const genreMap = useMemo(() => {
    const map = new Map<number, { name: string; count: number; hours: number }>();
    filteredMedia.forEach((item) => {
      const mins =
        item.media_type === "movie"
          ? item.runtime ?? 0
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

  return (
    <>
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
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        {/* Year */}
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
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type */}
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

        {/* Language */}
        <div className="min-w-[120px]">
          <label className="block text-xs font-semibold mb-1 text-neutral-400">Language</label>
          <Select value={selectedLang} onValueChange={setSelectedLang}>
            <SelectTrigger>
              <SelectValue placeholder="All languages" />
            </SelectTrigger>
            <SelectContent>
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

      {/* Secondary Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <GlassStatCard
          icon={Film}
          label={t("stats.totalWatched", "Total Watched")}
          value={filteredMedia.length}
          description={`${totalMovies} ${t("common.movies", "Movies").toLowerCase()}, ${totalTV} ${t(
            "common.tvShows",
            "TV Shows"
          ).toLowerCase()}`}
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
      </div>

      {/* Genre Breakdown */}
      {genreStats.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>{t("stats.genreDistribution", "Genre Distribution")}</CardTitle>
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("stats.hoursByGenre", "Hours by Genre")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={genreStats}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export default EnhancedStats;