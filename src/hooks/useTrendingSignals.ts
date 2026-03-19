import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type HourBucket = { ts: string; count: number };

export const useTrendingForMedia = (mediaType: 'movie' | 'tv', mediaId: number) => {
  return useQuery({
    queryKey: ['trending', mediaType, mediaId],
    queryFn: async () => {
    if (!mediaId) return { series: [] as number[], buckets: [] as HourBucket[], total: 0 };

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('user_watchlist')
      .select('added_at')
      .eq('media_id', mediaId)
      .eq('media_type', mediaType)
      .gte('added_at', cutoff);

    if (error) {
      console.error('Trending fetch error', error);
      return { series: [], buckets: [], total: 0 };
    }

    // Prepare 24 hourly buckets (oldest -> newest)
    const now = Date.now();
    const buckets: HourBucket[] = Array.from({ length: 24 }).map((_, i) => {
      const ts = new Date(now - (23 - i) * 60 * 60 * 1000);
      // normalize to hour start
      ts.setMinutes(0, 0, 0);
      return { ts: ts.toISOString(), count: 0 };
    });

    (data || []).forEach((row: { added_at: string }) => {
      const added = new Date(row.added_at).getTime();
      const diffHours = Math.floor((now - added) / (60 * 60 * 1000));
      if (diffHours >= 0 && diffHours < 24) {
        const idx = 23 - diffHours; // map recent to last index
        buckets[idx].count += 1;
      }
    });

    const series = buckets.map(b => b.count);
    const total = series.reduce((s, v) => s + v, 0);
    return { series, buckets, total };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });
};

export default useTrendingForMedia;
