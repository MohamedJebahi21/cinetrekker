import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Film, Tv, Clock, TrendingUp } from "lucide-react";
import SEO from "@/components/SEO";

interface WatchedItem {
  media_id: number;
  media_type: 'movie' | 'tv';
  runtime?: number;
  genres?: string[];
}

interface GenreCount {
  genre: string;
  count: number;
}

export default function Stats() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: watchedItems, isLoading } = useQuery({
    queryKey: ['watched-stats', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('watched')
        .select('media_id, media_type, runtime, genres')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as WatchedItem[];
    },
    enabled: !!user,
  });

  const calculateStats = () => {
    if (!watchedItems?.length) {
      return {
        totalHours: 0,
        movieCount: 0,
        tvCount: 0,
        topGenres: [] as GenreCount[],
      };
    }

    // Calculate total hours
    const totalMinutes = watchedItems.reduce((sum, item) => {
      return sum + (item.runtime || 0);
    }, 0);

    // Count by type
    const movieCount = watchedItems.filter(item => item.media_type === 'movie').length;
    const tvCount = watchedItems.filter(item => item.media_type === 'tv').length;

    // Calculate top genres
    const genreMap = new Map<string, number>();
    watchedItems.forEach(item => {
      item.genres?.forEach(genre => {
        genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
      });
    });

    const topGenres = Array.from(genreMap.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalHours: Math.round(totalMinutes / 60),
      movieCount,
      tvCount,
      topGenres,
    };
  };

  const stats = calculateStats();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <SEO 
          title="Stats — CineTrekker" 
          description="View your watching statistics"
        />
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t('common.signInRequired')}</CardTitle>
            <CardDescription>
              Sign in to view your watching statistics
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SEO 
        title="Stats — CineTrekker" 
        description="View your watching statistics and insights"
      />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('nav.stats')}</h1>
        <p className="text-muted-foreground">
          Your watching journey at a glance
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Hours Watched
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalHours}h</div>
                <p className="text-xs text-muted-foreground">
                  That's {Math.round(stats.totalHours / 24)} days!
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Movies Watched
                </CardTitle>
                <Film className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.movieCount}</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  TV Shows Watched
                </CardTitle>
                <Tv className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.tvCount}</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Items
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.movieCount + stats.tvCount}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Genres */}
          <Card>
            <CardHeader>
              <CardTitle>Your Top Genres</CardTitle>
              <CardDescription>
                The genres you watch the most
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.topGenres.length > 0 ? (
                <div className="space-y-4">
                  {stats.topGenres.map((genre, index) => (
                    <div key={genre.genre} className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-muted-foreground w-8">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{genre.genre}</span>
                          <span className="text-sm text-muted-foreground">
                            {genre.count} {genre.count === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ 
                              width: `${(genre.count / (watchedItems?.length || 1)) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Start watching movies and shows to see your top genres!
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
