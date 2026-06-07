import { lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserLists } from "@/contexts/UserListsContext";
import { getMovieDetails, getTVDetails } from "@/services/tmdb";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Award, Clock, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getMediaTitle } from "@/services/tmdb";

const YearInReviewGenreChart = lazy(
  () => import("@/components/stats/YearInReviewGenreChart"),
);
const YearInReviewMonthlyChart = lazy(
  () => import("@/components/stats/YearInReviewMonthlyChart"),
);

type MovieDetails = Awaited<ReturnType<typeof getMovieDetails>>;
type TVDetails = Awaited<ReturnType<typeof getTVDetails>>;
type DetailItem = MovieDetails | TVDetails;
type SeasonSummary = { episode_count?: number };
type GenreSummary = { name: string };

const YEAR_IN_REVIEW_MAX_TITLES_PER_TYPE = 24;
const YEAR_IN_REVIEW_FETCH_CONCURRENCY = 4;
const YEAR_IN_REVIEW_STALE_TIME_MS = 30 * 60 * 1000;

async function fetchWithConcurrency<TInput, TOutput>(
  items: TInput[],
  worker: (item: TInput) => Promise<TOutput>,
): Promise<TOutput[]> {
  const results: TOutput[] = [];

  for (let index = 0; index < items.length; index += YEAR_IN_REVIEW_FETCH_CONCURRENCY) {
    const chunk = items.slice(index, index + YEAR_IN_REVIEW_FETCH_CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map((item) => worker(item)));
    for (const item of settled) {
      if (item.status === "fulfilled") {
        results.push(item.value);
      }
    }
  }

  return results;
}

export default function YearInReview() {
  const currentYear = new Date().getFullYear();
  const { watched } = useUserLists();
  
  const watchedMovies = watched.filter(item => item.mediaType === 'movie');
  const watchedTV = watched.filter(item => item.mediaType === 'tv');

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
      const movieIds = thisYearMovies
        .slice(0, YEAR_IN_REVIEW_MAX_TITLES_PER_TYPE)
        .map((item) => item.mediaId);
      return fetchWithConcurrency(movieIds, (mediaId) => getMovieDetails(mediaId));
    },
    enabled: thisYearMovies.length > 0,
    staleTime: YEAR_IN_REVIEW_STALE_TIME_MS,
  });

  const { data: tvDetails = [] } = useQuery({
    queryKey: ["year-review-tv", currentYear],
    queryFn: async () => {
      const tvIds = thisYearTV
        .slice(0, YEAR_IN_REVIEW_MAX_TITLES_PER_TYPE)
        .map((item) => item.mediaId);
      return fetchWithConcurrency(tvIds, (mediaId) => getTVDetails(mediaId));
    },
    enabled: thisYearTV.length > 0,
    staleTime: YEAR_IN_REVIEW_STALE_TIME_MS,
  });

  // Calculate statistics
  const totalRuntime = (movieDetails || []).reduce((acc, movie) => acc + (movie?.runtime || 0), 0) +
    (tvDetails || []).reduce((acc, show) => {
      const avgEpisodeRuntime = show?.episode_run_time?.[0] || 45;
      const totalEpisodes = (show?.seasons || [])
        .filter((s) => s.season_number > 0)
        .reduce((sum: number, s) => sum + s.episode_count, 0) || 0;
      return acc + (avgEpisodeRuntime * totalEpisodes);
    }, 0);

  const totalHours = Math.round(totalRuntime / 60);
  const totalDays = Math.round(totalHours / 24);

  // Genre breakdown
  const genreCount: Record<string, number> = {};
  [...(movieDetails || []), ...(tvDetails || [])].forEach((item) => {
    item?.genres?.forEach((genre) => {
      genreCount[genre.name] = (genreCount[genre.name] || 0) + 1;
    });
  });

  const genreData = Object.entries(genreCount)
    .map(([name, count]) => ({ name, value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const COLORS = ['#E50914', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];

  // Top rated items
  const allItems = [...(movieDetails || []), ...(tvDetails || [])];
  const topRated = allItems
    .sort((a, b) => (b?.vote_average || 0) - (a?.vote_average || 0))
    .slice(0, 5);

  // Monthly breakdown
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2000, i).toLocaleString('default', { month: 'short' }),
    count: 0
  }));

  [...thisYearMovies, ...thisYearTV].forEach(item => {
    const watchedDateStr = item.watchedAt || item.addedAt;
    if (watchedDateStr) {
      const month = new Date(watchedDateStr).getMonth();
      monthlyData[month].count += 1;
    }
  });

  return (
    <>
      <SEO 
        title={`${currentYear} Year in Review`}
        description={`Your ${currentYear} watching statistics and highlights`}
      />
      
      <div className="page-container pt-20 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{currentYear} Year in Review</h1>
            <p className="text-muted-foreground mt-1">
              Your watching journey this year
            </p>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="ct-panel rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-lg">{t("yearInReview.totalWatched", "Total Watched")}</h3>
              </div>
              <p className="text-4xl font-bold text-foreground sm:text-5xl">{totalWatched}</p>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                {t("yearInReview.moviesAndShows", "{{movies}} movies • {{shows}} TV shows", {
                  movies: thisYearMovies.length,
                  shows: thisYearTV.length,
                })}
              </p>
            </Card>

            <Card className="ct-panel rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-lg">{t("yearInReview.timeInvested", "Time Invested")}</h3>
              </div>
              <p className="text-4xl font-bold text-foreground sm:text-5xl">{totalHours}h</p>
              <p className="text-neutral-400 mt-1">{t("yearInReview.daysOfContent", "≈ {{days}} days of content", { days: totalDays })}</p>
            </Card>

            <Card className="ct-panel rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <Award className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-lg">{t("yearInReview.favoriteGenre", "Favorite Genre")}</h3>
              </div>
              <p className="text-2xl font-bold text-foreground truncate sm:text-3xl">
                {genreData[0]?.name || "—"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                {t("yearInReview.titlesCount", "{{count}} titles", { count: genreData[0]?.value || 0 })}
              </p>
            </Card>

            <Card className="ct-panel rounded-3xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <Flame className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-lg">{t("yearInReview.busiestMonth", "Busiest Month")}</h3>
              </div>
              <p className="text-2xl font-bold text-foreground sm:text-3xl">{busiestMonth.month}</p>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                {t("yearInReview.titlesWatched", "{{count}} titles watched", { count: busiestMonth.count })}
              </p>
            </Card>
          </div>

          {/* Tabs Section */}
          <Tabs defaultValue="genres" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl border border-border/50 bg-card/70 p-1">
              <TabsTrigger value="genres" className="rounded-xl px-2 text-xs sm:text-sm">{t("yearInReview.tabs.genres", "Genres")}</TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-xl px-2 text-xs sm:text-sm">{t("yearInReview.tabs.activity", "Activity")}</TabsTrigger>
              <TabsTrigger value="highlights" className="rounded-xl px-2 text-xs sm:text-sm">{t("yearInReview.tabs.topRated", "Top Rated")}</TabsTrigger>
            </TabsList>

            {/* Genre Breakdown */}
            <TabsContent value="genres" className="mt-6">
              <Card className="ct-panel rounded-3xl p-5 sm:p-8">
                <CardHeader className="px-0 pb-6">
                  <CardTitle>{t("yearInReview.favoriteGenresTitle", "Your Favorite Genres")}</CardTitle>
                </CardHeader>
                <Suspense
                  fallback={
                    <div className="h-[360px] animate-pulse rounded-2xl bg-white/5" />
                  }
                >
                  <YearInReviewGenreChart data={genreData} />
                </Suspense>
              </Card>
            </TabsContent>

            {/* Monthly Timeline */}
            <TabsContent value="timeline" className="mt-6">
              <Card className="ct-panel rounded-3xl p-5 sm:p-8">
                <CardHeader className="px-0 pb-6">
                  <CardTitle>{t("yearInReview.monthlyActivityTitle", "Monthly Watching Activity")}</CardTitle>
                </CardHeader>
                <Suspense
                  fallback={
                    <div className="h-[360px] animate-pulse rounded-2xl bg-white/5" />
                  }
                >
                  <YearInReviewMonthlyChart data={monthlyData} />
                </Suspense>
              </Card>
            </TabsContent>

            {/* Top Rated Highlights */}
            <TabsContent value="highlights" className="mt-6">
              <Card className="ct-panel rounded-3xl p-5 sm:p-8">
                <CardHeader className="px-0 pb-6">
                  <CardTitle>{t("yearInReview.topRatedTitle", "Top Rated This Year")}</CardTitle>
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
                        <p className="font-medium truncate"><bdi dir="auto">{getMediaTitle(item)}</bdi></p>
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

        {totalWatched === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              Start watching content to see your {currentYear} review!
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Total Watched</h3>
                </div>
                <p className="text-3xl font-bold">{totalWatched}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {thisYearMovies.length} movies, {thisYearTV.length} shows
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Time Invested</h3>
                </div>
                <p className="text-3xl font-bold">{totalHours}h</p>
                <p className="text-sm text-muted-foreground mt-1">
                  That's {totalDays} days!
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Top Genre</h3>
                </div>
                <p className="text-2xl font-bold">{genreData[0]?.name || 'N/A'}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {genreData[0]?.value || 0} items
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Busiest Month</h3>
                </div>
                <p className="text-2xl font-bold">
                  {monthlyData.reduce((max, curr) => curr.count > max.count ? curr : max).month}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {monthlyData.reduce((max, curr) => Math.max(max, curr.count), 0)} watched
                </p>
              </Card>
            </div>

            <Tabs defaultValue="genres" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="genres">Genre Breakdown</TabsTrigger>
                <TabsTrigger value="timeline">Monthly Timeline</TabsTrigger>
                <TabsTrigger value="highlights">Top Rated</TabsTrigger>
              </TabsList>

              <TabsContent value="genres">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Your Favorite Genres</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={genreData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name} (${entry.value})`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {genreData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="timeline">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Watching Activity by Month</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#E50914" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="highlights">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Your Top Rated Content</h3>
                  <div className="space-y-3">
                    {topRated.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                        <Badge className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-semibold">{item.title || item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ⭐ {item.vote_average?.toFixed(1)} / 10
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </>
  );
}
