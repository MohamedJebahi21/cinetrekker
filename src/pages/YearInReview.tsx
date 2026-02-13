import { useQuery } from '@tanstack/react-query';
import { useUserLists } from '@/contexts/UserListsContext';
import { getMovieDetails, getTVDetails } from '@/services/tmdb';
import { SEO } from '@/components/SEO';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Award from 'lucide-react/dist/esm/icons/award';
import Clock from 'lucide-react/dist/esm/icons/clock';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';

export default function YearInReview() {
  const currentYear = new Date().getFullYear();
  const { watched } = useUserLists();
  
  const watchedMovies = watched.filter(item => item.mediaType === 'movie');
  const watchedTV = watched.filter(item => item.mediaType === 'tv');

  // Filter items watched this year
  const thisYearMovies = watchedMovies.filter(item => {
    const watchedDate = (item as any).watchedAt || (item as any).addedAt;
    if (!watchedDate) return false;
    const date = new Date(watchedDate);
    return date.getFullYear() === currentYear;
  });

  const thisYearTV = watchedTV.filter(item => {
    const watchedDate = (item as any).watchedAt || (item as any).addedAt;
    if (!watchedDate) return false;
    const date = new Date(watchedDate);
    return date.getFullYear() === currentYear;
  });

  const totalWatched = thisYearMovies.length + thisYearTV.length;

  // Fetch details for watched items
  const { data: movieDetails } = useQuery({
    queryKey: ['year-review-movies', currentYear],
    queryFn: async () => {
      const details = await Promise.all(
        thisYearMovies.slice(0, 50).map(item => getMovieDetails(item.mediaId))
      );
      return details;
    },
    enabled: thisYearMovies.length > 0
  });

  const { data: tvDetails } = useQuery({
    queryKey: ['year-review-tv', currentYear],
    queryFn: async () => {
      const details = await Promise.all(
        thisYearTV.slice(0, 50).map(item => getTVDetails(item.mediaId))
      );
      return details;
    },
    enabled: thisYearTV.length > 0
  });

  // Calculate statistics
  const totalRuntime = (movieDetails || []).reduce((acc, movie) => acc + (movie.runtime || 0), 0) +
    (tvDetails || []).reduce((acc, show) => {
      const avgEpisodeRuntime = show.episode_run_time?.[0] || 45;
      const totalEpisodes = show.seasons
        ?.filter((s: any) => s.season_number > 0)
        .reduce((sum: number, s: any) => sum + s.episode_count, 0) || 0;
      return acc + (avgEpisodeRuntime * totalEpisodes);
    }, 0);

  const totalHours = Math.round(totalRuntime / 60);
  const totalDays = Math.round(totalHours / 24);

  // Genre breakdown
  const genreCount: { [key: string]: number } = {};
  [...(movieDetails || []), ...(tvDetails || [])].forEach((item: any) => {
    item.genres?.forEach((genre: any) => {
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
    .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
    .slice(0, 5);

  // Monthly breakdown
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2000, i).toLocaleString('default', { month: 'short' }),
    count: 0
  }));

  [...thisYearMovies, ...thisYearTV].forEach(item => {
    const watchedDate = (item as any).watchedAt || (item as any).addedAt;
    if (watchedDate) {
      const month = new Date(watchedDate).getMonth();
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
                    {topRated.map((item: any, index) => (
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
