import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserLists } from "@/contexts/UserListsContext";
import { getMovieDetails, getTVDetails } from "@/services/tmdb";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Award, Clock, Flame } from "lucide-react";
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

const COLORS = ["#E50914", "#ff6b73", "#f97316", "#f59e0b", "#fb7185"];

type MovieDetails = Awaited<ReturnType<typeof getMovieDetails>>;
type TVDetails = Awaited<ReturnType<typeof getTVDetails>>;
type DetailItem = MovieDetails | TVDetails;
type SeasonSummary = { episode_count?: number };
type GenreSummary = { name: string };

export default function YearInReview() {
  const currentYear = new Date().getFullYear();
  const { i18n } = useTranslation();
  const { watched } = useUserLists();

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

  // Fetch details (limited to avoid too many requests)
  const { data: movieDetails = [] } = useQuery({
    queryKey: ["year-review-movies", currentYear],
    queryFn: async () => {
      const promises = thisYearMovies.slice(0, 40).map((item) => 
        getMovieDetails(item.mediaId)
      );
      return Promise.all(promises);
    },
    enabled: thisYearMovies.length > 0,
  });

  const { data: tvDetails = [] } = useQuery({
    queryKey: ["year-review-tv", currentYear],
    queryFn: async () => {
      const promises = thisYearTV.slice(0, 40).map((item) => 
        getTVDetails(item.mediaId)
      );
      return Promise.all(promises);
    },
    enabled: thisYearTV.length > 0,
  });

  const allDetails = useMemo(
    () => [...movieDetails, ...tvDetails] as DetailItem[],
    [movieDetails, tvDetails],
  );

  // Stats
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
              (sum: number, season: SeasonSummary) =>
                sum + (season.episode_count || 0),
              0,
            ) || 0;
          return acc + avgRuntime * totalEpisodes;
        }
      return acc;
    }, 0);
  }, [allDetails]);

  const totalHours = Math.round(totalRuntime / 60);
  const totalDays = Math.round(totalHours / 24);

  // Genre Breakdown
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

  // Monthly Activity
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

  // Top Rated
  const topRated = useMemo(() => {
    return [...allDetails]
      .sort((a, b) => (b?.vote_average || 0) - (a?.vote_average || 0))
      .slice(0, 5);
  }, [allDetails]);

  const busiestMonth = useMemo(() => {
    return monthlyData.reduce((max, curr) => (curr.count > max.count ? curr : max));
  }, [monthlyData]);

  if (totalWatched === 0) {
    return (
      <>
        <SEO title={`${currentYear} Year in Review`} />
        <div className="ct-page-shell flex min-h-screen items-center justify-center px-4">
          <Card className="ct-panel max-w-md p-12 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h2 className="mb-2 text-2xl font-semibold text-foreground">No Activity Yet</h2>
            <p className="text-muted-foreground">
              Start watching in {currentYear} to see your Year in Review!
            </p>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title={`${currentYear} Year in Review`}
        description={`Your ${currentYear} watching statistics and highlights`}
        canonical="https://cinetrekker.vercel.app/year-in-review"
      />

      <div className="ct-page-shell min-h-screen px-4 pb-24 pt-8 sm:pb-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-start gap-3 sm:mb-10 sm:items-center sm:gap-4">
            <div className="rounded-2xl bg-primary/12 p-3">
              <Calendar className="h-9 w-9 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{currentYear} Year in Review</h1>
              <p className="text-sm text-muted-foreground sm:text-lg">Your cinematic journey this year</p>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="ct-panel rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-lg">Total Watched</h3>
              </div>
              <p className="text-4xl font-bold text-foreground sm:text-5xl">{totalWatched}</p>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                {thisYearMovies.length} movies • {thisYearTV.length} TV shows
              </p>
            </Card>

            <Card className="ct-panel rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-lg">Time Invested</h3>
              </div>
              <p className="text-4xl font-bold text-foreground sm:text-5xl">{totalHours}h</p>
              <p className="text-neutral-400 mt-1">≈ {totalDays} days of content</p>
            </Card>

            <Card className="ct-panel rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <Award className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-lg">Favorite Genre</h3>
              </div>
              <p className="text-2xl font-bold text-foreground truncate sm:text-3xl">
                {genreData[0]?.name || "—"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                {genreData[0]?.value || 0} titles
              </p>
            </Card>

            <Card className="ct-panel rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <Flame className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-lg">Busiest Month</h3>
              </div>
              <p className="text-2xl font-bold text-foreground sm:text-3xl">{busiestMonth.month}</p>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">{busiestMonth.count} titles watched</p>
            </Card>
          </div>

          {/* Tabs Section */}
          <Tabs defaultValue="genres" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl border border-border/50 bg-card/70 p-1">
              <TabsTrigger value="genres" className="rounded-xl px-2 text-xs sm:text-sm">Genres</TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-xl px-2 text-xs sm:text-sm">Activity</TabsTrigger>
              <TabsTrigger value="highlights" className="rounded-xl px-2 text-xs sm:text-sm">Top Rated</TabsTrigger>
            </TabsList>

            {/* Genre Breakdown */}
            <TabsContent value="genres" className="mt-6">
              <Card className="ct-panel rounded-3xl p-5 sm:p-8">
                <CardHeader className="px-0 pb-6">
                  <CardTitle>Your Favorite Genres</CardTitle>
                </CardHeader>
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genreData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={130}
                        dataKey="value"
                        nameKey="name"
                      >
                        {genreData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </TabsContent>

            {/* Monthly Timeline */}
            <TabsContent value="timeline" className="mt-6">
              <Card className="ct-panel rounded-3xl p-5 sm:p-8">
                <CardHeader className="px-0 pb-6">
                  <CardTitle>Monthly Watching Activity</CardTitle>
                </CardHeader>
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <XAxis dataKey="month" tick={{ fill: "#aaa" }} />
                      <YAxis tick={{ fill: "#aaa" }} />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#E50914" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </TabsContent>

            {/* Top Rated Highlights */}
            <TabsContent value="highlights" className="mt-6">
              <Card className="ct-panel rounded-3xl p-5 sm:p-8">
                <CardHeader className="px-0 pb-6">
                  <CardTitle>Top Rated This Year</CardTitle>
                </CardHeader>
                <div className="space-y-4">
                  {topRated.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-white/20 sm:gap-4 sm:p-4"
                    >
                      <Badge variant="secondary" className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold">
                        {index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title || item.name}</p>
                        <p className="text-sm text-neutral-400">
                          ⭐ {item.vote_average?.toFixed(1)} • {item.release_date?.slice(0,4) || item.first_air_date?.slice(0,4)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
