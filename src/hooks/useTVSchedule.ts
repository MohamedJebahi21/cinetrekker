import { useQuery } from "@tanstack/react-query";
import type { TVSchedule } from "@/lib/schemas/apiContracts";

export function useTVSchedule(imdbId?: string | null, isTV?: boolean) {
  return useQuery<TVSchedule | null>({
    queryKey: ["tv-schedule", imdbId],
    queryFn: async () => {
      if (!imdbId) return null;
      try {
        const res = await fetch(`/api/enrichment/tv-schedule?imdb_id=${encodeURIComponent(imdbId)}`);
        if (!res.ok) return null;
        return (await res.json()) as TVSchedule;
      } catch {
        return null;
      }
    },
    enabled: Boolean(isTV && imdbId && /^tt\d{5,10}$/.test(imdbId)),
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
    gcTime: 1000 * 60 * 60 * 12,
    retry: 1,
  });
}
