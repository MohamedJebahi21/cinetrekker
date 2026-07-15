import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUserLists } from "@/contexts/UserListsContext";
import { getMovieDetails, getTVDetails, getImageUrl } from "@/services/tmdb";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Image } from "@/components/ui/Image";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  TrendingUp,
  Award,
  Clock,
  Flame,
  ArrowRight,
  Sparkles,
  BarChart2,
  Film,
  Star,
  Tv,
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
  Tooltip as RechartsTooltip,
} from "recharts";
import { useTranslation } from "react-i18next";
import { getMediaTitle } from "@/services/tmdb";
import { cn } from "@/lib/utils";

const CINEMATIC_CHART_COLORS = [
  "#E50914", // Netflix Red
  "#F97316", // Amber Orange
  "#F59E0B", // Gold
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
];

type MovieDetails = Awaited<ReturnType<typeof getMovieDetails>>;
type TVDetails = Awaited<ReturnType<typeof getTVDetails>>;
type DetailItem = MovieDetails | TVDetails;
type SeasonSummary = { episode_count?: number };
type GenreSummary = { name: string };

export default function YearInReview() {
  const { t, i18n } = useTranslation();
  const { watched } = useUserLists();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Calculate all years user has logged watch history
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    watched.forEach((item) => {
      const dateStr = item.watchedAt || item.addedAt;
      if (dateStr) {
        const yr = new Date(dateStr).getFullYear();
        if (!Number.isNaN(yr)) {
          yearsSet.add(yr);
        }
      }
    });

    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear());
    }

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [watched]);

  // Sync active year with searchParams
  const currentYear = useMemo(() => {
    const yearParam = searchParams.get("year");
    if (yearParam && !Number.isNaN(Number(yearParam))) {
      return Number(yearParam);
    }
    return availableYears[0] || new Date().getFullYear();
  }, [searchParams, availableYears]);

  // Update selected year URL parameter
  const handleYearChange = (year: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("year", year);
    setSearchParams(nextParams);
  };

  // Filter this year's watched content
  const thisYearWatched = useMemo(() => {
    return watched.filter((item) => {
      const dateStr = item.watchedAt || item.addedAt;
      if (!dateStr) return false;
      return new Date(dateStr).getFullYear() === currentYear;
    });
  }, [watched, currentYear]);

  const thisYearMovies = thisYearWatched.filter((item) => item.mediaType === "movie");
  const thisYearTV = thisYearWatched.filter((item) => item.mediaType === "tv");
  const totalWatched = thisYearWatched.length;

  // Fetch details (limited to avoid too many concurrent requests)
  const { data: movieDetails = [], isLoading: loadingMovies } = useQuery({
    queryKey: ["year-review-movies-enhanced", currentYear, thisYearMovies.length],
    queryFn: async () => {
      const promises = thisYearMovies.slice(0, 40).map((item) =>
        getMovieDetails(item.mediaId).catch(() => null),
      );
      const results = await Promise.all(promises);
      return results.filter((item): item is MovieDetails => item !== null);
    },
    enabled: thisYearMovies.length > 0,
  });

  const { data: tvDetails = [], isLoading: loadingTV } = useQuery({
    queryKey: ["year-review-tv-enhanced", currentYear, thisYearTV.length],
    queryFn: async () => {
      const promises = thisYearTV.slice(0, 40).map((item) =>
        getTVDetails(item.mediaId).catch(() => null),
      );
      const results = await Promise.all(promises);
      return results.filter((item): item is TVDetails => item !== null);
    },
    enabled: thisYearTV.length > 0,
  });

  const allDetails = useMemo(() => {
    return [...movieDetails, ...tvDetails] as DetailItem[];
  }, [movieDetails, tvDetails]);

  // Calculation of total runtime metrics
  const totalRuntime = useMemo(() => {
    return allDetails.reduce((acc, item) => {
      if (!item) return acc;
      if ("runtime" in item && item.runtime) {
        return acc + item.runtime;
      }
      if ("episode_run_time" in item && item.episode_run_time?.[0]) {
        const avgRuntime = item.episode_run_time[0];
        const totalEpisodes =
          item.seasons?.reduce(
            (sum: number, season: SeasonSummary) => sum + (season.episode_count || 0),
            0,
          ) || 0;
        return acc + avgRuntime * totalEpisodes;
      }
      return acc;
    }, 0);
  }, [allDetails]);

  const totalHours = Math.round(totalRuntime / 60);
  const totalDays = Math.round(totalHours / 24);

  // Genre breakdown
  const genreData = useMemo(() => {
    const count: Record<string, number> = {};
    allDetails.forEach((item) => {
      item?.genres?.forEach((genre: GenreSummary) => {
        count[genre.name] = (count[genre.name] || 0) + 1;
      });
    });

    return Object.entries(count)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [allDetails]);

  // Monthly activity trend
  const monthlyData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2000, i).toLocaleString(i18n.language || "en", { month: "short" }),
      count: 0,
    }));

    thisYearWatched.forEach((item) => {
      const dateStr = item.watchedAt || item.addedAt;
      if (dateStr) {
        const month = new Date(dateStr).getMonth();
        data[month].count += 1;
      }
    });

    return data;
  }, [thisYearWatched, i18n.language]);

  // Top Rated Nominees
  const topRated = useMemo(() => {
    return [...allDetails]
      .sort((a, b) => (b?.vote_average || 0) - (a?.vote_average || 0))
      .slice(0, 5);
  }, [allDetails]);

  const busiestMonth = useMemo(() => {
    return monthlyData.reduce(
      (max, curr) => (curr.count > max.count ? curr : max),
      { month: "—", count: 0 },
    );
  }, [monthlyData]);

  const isLoading = loadingMovies || loadingTV;

  // Empty state rendering
  if (totalWatched === 0) {
    return (
      <>
        <SEO title={t("yearInReview.seoTitle", "{{year}} Year in Review", { year: currentYear })} />
        <div className="ct-page-shell flex min-h-screen items-center justify-center px-4">
          <Card className="ct-panel max-w-md p-10 text-center space-y-6 backdrop-blur-md">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Calendar className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-foreground">
                {t("yearInReview.emptyTitle", "No Activity Yet")}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(
                  "yearInReview.emptyDescription",
                  "Start watching in {{year}} to see your Year in Review!",
                  {
                    year: currentYear,
                  },
                )}
              </p>
            </div>

            {/* If they have other years, let them select it! */}
            {availableYears.length > 1 && (
              <div className="pt-2 flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                  Browse previous years
                </span>
                <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-full rounded-xl border-border/40 bg-card/40 text-xs">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 bg-popover/95 backdrop-blur-sm">
                    {availableYears.map((yr) => (
                      <SelectItem key={yr} value={yr.toString()}>
                        {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title={t("yearInReview.seoTitle", "{{year}} Year in Review", { year: currentYear })}
        description={t(
          "yearInReview.seoDescription",
          "Your {{year}} watching statistics and highlights",
          { year: currentYear },
        )}
        canonical="https://cinetrekker.vercel.app/year-in-review"
      />

      <div className="ct-page-shell min-h-screen px-4 pb-24 pt-20 sm:pb-10">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Cinematic wrapped recap header */}
          <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/25 p-6 sm:p-8 backdrop-blur-md">
            {/* Glowing background radial overlays */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(229,9,20,0.12),transparent_70%)] pointer-events-none" />
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-center justify-between">
              <div className="space-y-3 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
                  <Sparkles className="h-3.5 w-3.5 fill-current animate-pulse" />
                  Annual Recap
                </div>
                <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                  {t("yearInReview.title", "{{year}} Year in Review", { year: currentYear })}
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm max-w-lg">
                  {t("yearInReview.subtitle", "Your cinematic journey this year")}
                </p>
              </div>

              {/* Ceremony recap year switcher */}
              <div className="flex flex-col gap-1.5 w-36 shrink-0 text-center sm:text-left">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Recap Year
                </span>
                <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                  <SelectTrigger className="rounded-xl border-border/40 bg-card/45 text-xs min-h-[38px]">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder="Year" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 bg-popover/95 backdrop-blur-sm">
                    {availableYears.map((yr) => (
                      <SelectItem key={yr} value={yr.toString()}>
                        {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Upgraded Glass Stat Cards overview row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Total titles watched */}
            <Card className="ct-panel relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 p-6 backdrop-blur-sm flex flex-col justify-between h-40">
              <div className="flex items-center gap-3 text-primary mb-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {t("yearInReview.totalWatched", "Total Watched")}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-black text-foreground">{totalWatched}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {t("yearInReview.moviesAndShows", "{{movies}} movies • {{shows}} TV shows", {
                    movies: thisYearMovies.length,
                    shows: thisYearTV.length,
                  })}
                </p>
              </div>
            </Card>

            {/* 2. Time Invested */}
            <Card className="ct-panel relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 p-6 backdrop-blur-sm flex flex-col justify-between h-40">
              <div className="flex items-center gap-3 text-primary mb-2">
                <Clock className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {t("yearInReview.timeInvested", "Time Invested")}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-black text-foreground">{totalHours}h</p>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {t("yearInReview.daysOfContent", "≈ {{days}} days of content", {
                    days: totalDays,
                  })}
                </p>
              </div>
            </Card>

            {/* 3. Favorite Genre */}
            <Card className="ct-panel relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 p-6 backdrop-blur-sm flex flex-col justify-between h-40">
              <div className="flex items-center gap-3 text-primary mb-2">
                <Award className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {t("yearInReview.favoriteGenre", "Favorite Genre")}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black text-foreground truncate">
                  {genreData[0]?.name || "—"}
                </p>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {t("yearInReview.titlesCount", "{{count}} titles", {
                    count: genreData[0]?.value || 0,
                  })}
                </p>
              </div>
            </Card>

            {/* 4. Busiest Month */}
            <Card className="ct-panel relative overflow-hidden rounded-3xl border border-border/40 bg-card/40 p-6 backdrop-blur-sm flex flex-col justify-between h-40">
              <div className="flex items-center gap-3 text-primary mb-2">
                <Flame className="h-5 w-5" />
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {t("yearInReview.busiestMonth", "Busiest Month")}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black text-foreground">{busiestMonth.month}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {t("yearInReview.titlesWatched", "{{count}} titles watched", {
                    count: busiestMonth.count,
                  })}
                </p>
              </div>
            </Card>
          </div>

          {/* Upgraded tabs panel Recaps */}
          <Tabs defaultValue="genres" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl border border-border/40 bg-card/40 p-1 max-w-md">
              <TabsTrigger value="genres" className="rounded-xl py-2 text-xs font-bold">
                {t("yearInReview.tabs.genres", "Genres")}
              </TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-xl py-2 text-xs font-bold">
                {t("yearInReview.tabs.activity", "Activity")}
              </TabsTrigger>
              <TabsTrigger value="highlights" className="rounded-xl py-2 text-xs font-bold">
                {t("yearInReview.tabs.topRated", "Top Rated")}
              </TabsTrigger>
            </TabsList>

            {/* 1. Genre share breakdown */}
            <TabsContent value="genres" className="outline-none">
              <Card className="ct-panel overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                    <BarChart2 className="h-4.5 w-4.5 text-primary" />
                    {t("yearInReview.favoriteGenresTitle", "Your Favorite Genres")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-8">
                  {isLoading ? (
                    <div className="h-[280px] flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  ) : genreData.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                      <ResponsiveContainer width="100%" height={260} className="md:max-w-[260px]">
                        <PieChart>
                          <Pie
                            data={genreData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={105}
                            dataKey="value"
                            nameKey="name"
                          >
                            {genreData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CINEMATIC_CHART_COLORS[index % CINEMATIC_CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip
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

                      {/* Custom legends list */}
                      <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:text-sm w-full">
                        {genreData.map((genre, idx) => (
                          <div key={genre.name} className="flex items-center gap-2.5">
                            <div
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  CINEMATIC_CHART_COLORS[idx % CINEMATIC_CHART_COLORS.length],
                              }}
                            />
                            <span className="truncate font-semibold text-foreground/95">
                              {genre.name}
                            </span>
                            <span className="text-muted-foreground/60 ml-auto font-bold">
                              {genre.value} {genre.value === 1 ? "title" : "titles"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-muted-foreground">
                      No genres logged this year.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 2. Activity timeline */}
            <TabsContent value="timeline" className="outline-none">
              <Card className="ct-panel overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                    <Calendar className="h-4.5 w-4.5 text-primary" />
                    {t("yearInReview.monthlyActivityTitle", "Monthly Watching Activity")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-8">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <RechartsTooltip
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 3. Top Rated highlights podium */}
            <TabsContent value="highlights" className="outline-none">
              <Card className="ct-panel overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                    <Star className="h-4.5 w-4.5 text-primary" />
                    {t("yearInReview.topRatedTitle", "Top Rated This Year")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-8 space-y-4">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 w-full animate-pulse bg-muted/20 rounded-2xl" />
                      ))}
                    </div>
                  ) : topRated.length > 0 ? (
                    <div className="space-y-4">
                      {topRated.map((item, index) => {
                        const isMovie = "title" in item;
                        const dateStr =
                          "release_date" in item
                            ? item.release_date
                            : "first_air_date" in item
                              ? item.first_air_date
                              : "";

                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-4 rounded-2xl border border-border/40 bg-background/55 p-3.5 hover:border-primary/30 transition-all duration-300 group"
                          >
                            {/* Podium ranking circle */}
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-primary/10 border border-primary/20 text-primary">
                              #{index + 1}
                            </div>

                            {/* Poster image */}
                            <div className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded-xl border border-border/40">
                              <Image
                                src={getImageUrl(item.poster_path, "w92")}
                                alt=""
                                width={92}
                                height={138}
                                className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                              />
                            </div>

                            {/* Details metadata */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={cn(
                                    "px-1.5 py-0.5 text-[8px] font-black leading-none border-0",
                                    isMovie ? "bg-primary" : "bg-amber-500 text-black",
                                  )}
                                >
                                  {isMovie ? "Movie" : "TV"}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  {dateStr ? dateStr.slice(0, 4) : "—"}
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                <bdi dir="auto">{getMediaTitle(item)}</bdi>
                              </h4>
                            </div>

                            {/* Rating and Direct link details */}
                            <div className="flex flex-col items-end gap-2.5 shrink-0">
                              <div className="inline-flex items-center gap-0.5 text-[10px] font-black text-foreground">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                {item.vote_average ? item.vote_average.toFixed(1) : "—"}
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
                    <div className="py-16 text-center text-muted-foreground">
                      No titles found.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
