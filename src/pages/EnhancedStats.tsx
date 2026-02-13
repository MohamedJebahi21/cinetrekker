import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserLists } from '@/contexts/UserListsContext';
import { getMovieDetails, getTVDetails } from '@/services/tmdb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Clock, Star, TrendingUp, Calendar, Award, Film, Tv } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SEO from '@/components/SEO';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface GenreStats {
  name: string;
  count: number;
  hours: number;
}

export default function EnhancedStats() {
  const { watched } = useUserLists();
  const { i18n } = useTranslation();
  const language = i18n.language;

  const { data: mediaDetails } = useQuery({
    queryKey: ['stats-details', watched.map((i) => `${i.mediaType}-${i.mediaId}`), language],
    queryFn: async () => {
      const results = await Promise.all(
        watched.map(async (item) => {
          try {
            const details =
              item.mediaType === 'movie'
                ? await getMovieDetails(item.mediaId, language)
                : await getTVDetails(item.mediaId, language);
            return { ...details, media_type: item.mediaType, userRating: item.rating, watchedAt: item.addedAt };
          } catch {
            return null;
          }
        })
      );
      return results.filter(Boolean);
    },
    enabled: watched.length > 0,
  });

  // Calculate stats
  const totalMovies = mediaDetails?.filter((m) => m.media_type === 'movie').length || 0;
  const totalTV = mediaDetails?.filter((m) => m.media_type === 'tv').length || 0;

  const totalHours =
    mediaDetails?.reduce((acc, item) => {
      const runtime = item.runtime || (item.episode_run_time && item.episode_run_time[0]) || 0;
      const episodes = item.media_type === 'tv' ? (item.number_of_episodes || 1) : 1;
      return acc + (runtime * episodes) / 60;
    }, 0) || 0;

  const avgRating =
    mediaDetails && mediaDetails.length > 0
      ? mediaDetails.reduce((acc, item) => acc + (item.vote_average || 0), 0) / mediaDetails.length
      : 0;

  // Genre breakdown
  const genreMap = new Map<number, { name: string; count: number; hours: number }>();
  mediaDetails?.forEach((item) => {
    const runtime = item.runtime || (item.episode_run_time && item.episode_run_time[0]) || 0;
    const episodes = item.media_type === 'tv' ? (item.number_of_episodes || 1) : 1;
    const hours = (runtime * episodes) / 60;

    item.genres?.forEach((genre: any) => {
      const existing = genreMap.get(genre.id) || { name: genre.name, count: 0, hours: 0 };
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

  // Calculate watching streak
  const sortedWatched = [...watched].sort(
    (a, b) => new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime()
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  sortedWatched.forEach((item) => {
    const itemDate = new Date(item.addedAt || 0);
    itemDate.setHours(0, 0, 0, 0);

    if (!lastDate) {
      tempStreak = 1;
    } else {
      const dayDiff = Math.floor((lastDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) {
        tempStreak++;
      } else if (dayDiff > 1) {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    lastDate = itemDate;
  });

  longestStreak = Math.max(longestStreak, tempStreak);

  // Check if watching recently for current streak
  if (sortedWatched.length > 0) {
    const mostRecent = new Date(sortedWatched[0].addedAt || 0);
    const today = new Date();
    const daysSinceLastWatch = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastWatch <= 1) {
      currentStreak = tempStreak;
    }
  }

  // Pie chart colors
  const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

  return (
    <>
      <SEO
        title="Enhanced Stats — CineTrekker"
        description="View detailed statistics about your watching habits"
        canonical="https://cinetrekker.vercel.app/stats"
      />
      <div className="page-container pt-20">
        <h1 className="section-title">Your Stats</h1>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Watched</CardTitle>
              <Film className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{watched.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalMovies} movies, {totalTV} shows
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Watched</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(totalHours)}h</div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(totalHours / 24)} days total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">out of 10</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentStreak} days</div>
              <p className="text-xs text-muted-foreground mt-1">Longest: {longestStreak} days</p>
            </CardContent>
          </Card>
        </div>

        {/* Genre Breakdown */}
        {genreStats.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Genre Distribution</CardTitle>
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
                <CardTitle>Hours by Genre</CardTitle>
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
      </div>
    </>
  );
}
