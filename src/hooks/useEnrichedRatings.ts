import { useQuery } from "@tanstack/react-query";
import type { EnrichedRatings } from "@/lib/schemas/apiContracts";

export function useEnrichedRatings(imdbId?: string | null) {
  return useQuery<EnrichedRatings | null>({
    queryKey: ["enriched-ratings", imdbId],
    queryFn: async () => {
      if (!imdbId) return null;
      try {
        const res = await fetch(`/api/enrichment/ratings?imdb_id=${encodeURIComponent(imdbId)}`);
        if (!res.ok) return null;
        return (await res.json()) as EnrichedRatings;
      } catch {
        return null;
      }
    },
    enabled: Boolean(imdbId && /^tt\d{5,10}$/.test(imdbId)),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours client cache
    gcTime: 1000 * 60 * 60 * 24 * 2,
    retry: 1,
  });
}
