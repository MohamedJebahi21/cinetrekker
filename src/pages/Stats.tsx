import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMovieDetails, getTVDetails } from '@/services/tmdb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Film, Tv, Clock, TrendingUp } from "lucide-react";
import StatsPanel from '@/components/Stats';
import { BingeTimer } from '@/components/BingeTimer';
import SEO from "@/components/SEO";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useRef, useState, useMemo } from 'react';

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

type TmdbGenre = { name: string };
type EnrichedWatchedItem = WatchedItem & { release_date?: string; rating?: number };

export default function Stats() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: watchedItems, isLoading } = useQuery({
    queryKey: ['watched-stats', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Supabase table does not contain runtime/genres columns; fetch basic watched rows
      const { data, error } = await supabase
        .from('user_watched')
        .select('media_id, media_type, watched_at')
        .eq('user_id', user.id as string);

      if (error) throw error;

      const rows = (data ?? []) as { media_id: number; media_type: string; watched_at?: string }[];

      // Enrich each watched item with runtime and genres from TMDB
      const enriched = await Promise.all(rows.map(async (r): Promise<EnrichedWatchedItem> => {
        try {
          if (r.media_type === 'movie') {
            const details = await getMovieDetails(r.media_id);
            return {
              media_id: r.media_id,
              media_type: 'movie' as const,
              runtime: details.runtime || 0,
              genres: (details.genres || []).map((g: TmdbGenre) => g.name),
              release_date: details.release_date,
              rating: details.vote_average,
            };
          } else {
            const details = await getTVDetails(r.media_id);
            const runtime = details.episode_run_time?.[0] ?? 0;
            return {
              media_id: r.media_id,
              media_type: 'tv' as const,
              runtime,
              genres: (details.genres || []).map((g: TmdbGenre) => g.name),
              release_date: details.first_air_date,
              rating: details.vote_average,
            };
          }
        } catch (err) {
          // If TMDB fetch fails, fall back to zero/empty
          return {
            media_id: r.media_id,
            media_type: (r.media_type as 'movie' | 'tv'),
            runtime: 0,
            genres: [],
          };
        }
      }));

      return enriched;
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

  const [decadeFilter, setDecadeFilter] = useState<string>('all');
  const [minRating, setMinRating] = useState<number | 'all'>('all');

  const containerRef = useRef<HTMLDivElement | null>(null);

  const availableDecades = useMemo(() => {
    if (!watchedItems) return ['all'];
    const set = new Set<string>();
    watchedItems.forEach(w => {
      const date = (w as EnrichedWatchedItem).release_date;
      if (!date) return;
      const year = parseInt(String(date).slice(0,4));
      const dec = `${Math.floor(year / 10) * 10}s`;
      set.add(dec);
    });
    return ['all', ...Array.from(set).sort()];
  }, [watchedItems]);

  const filteredWatched = useMemo(() => {
    if (!watchedItems) return watchedItems;
    return watchedItems.filter(w => {
      if (decadeFilter !== 'all') {
        const date = (w as EnrichedWatchedItem).release_date;
        if (!date) return false;
        const year = parseInt(String(date).slice(0,4));
        const dec = `${Math.floor(year / 10) * 10}s`;
        if (dec !== decadeFilter) return false;
      }
      if (minRating !== 'all') {
        const rating = (w as EnrichedWatchedItem).rating ?? 0;
        if (rating < (minRating as number)) return false;
      }
      return true;
    });
  }, [watchedItems, decadeFilter, minRating]);

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
          <div ref={containerRef}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex gap-3 items-center">
                <div className="w-48">
                  <Select onValueChange={(v) => setDecadeFilter(v)}>
                    <SelectTrigger>
                      <SelectValue>{decadeFilter === 'all' ? 'Any decade' : decadeFilter}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableDecades.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-40">
                  <Select onValueChange={(v) => setMinRating(v === 'all' ? 'all' : Number(v))}>
                    <SelectTrigger>
                      <SelectValue>{minRating === 'all' ? 'Any rating' : `≥ ${minRating}`}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any rating</SelectItem>
                      {[10,9,8,7,6,5,4,3,2,1].map(r => (
                        <SelectItem key={r} value={String(r)}>{`≥ ${r}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={async () => {
                if (!containerRef.current) return;
                try {
                  const { toPng } = await import('html-to-image');
                  const dataUrl = await toPng(containerRef.current, { cacheBust: true });
                  const link = document.createElement('a');
                  link.href = dataUrl;
                  link.download = 'cinetrekker-stats.png';
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch (err) {
                  console.error('Share capture failed', err);
                }
              }}>Share Stats</Button>
            </div>

            <StatsPanel watchedItems={filteredWatched} loading={isLoading} />
          </div>

          {/* Top Genres (existing detailed list) */}
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

          {/* Binge Timer */}
          <BingeTimer />
        </>
      )}
    </div>
  );
}
