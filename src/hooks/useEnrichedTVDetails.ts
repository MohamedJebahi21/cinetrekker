import { useQuery } from "@tanstack/react-query";
import type { TVDetailsResponse, TVEpisodesResponse } from "@/lib/schemas/apiContracts";

/**
 * Fetches enriched TV show details from TVmaze via the enrichment proxy.
 * Provides: broadcast schedule, network, next/prev episode, season summaries.
 *
 * Fail-soft: returns null if TVmaze lookup fails — TMDB remains primary source.
 */
export function useEnrichedTVDetails(imdbId?: string | null, isTV?: boolean) {
  return useQuery<TVDetailsResponse | null>({
    queryKey: ["tv-details-enriched", imdbId],
    queryFn: async () => {
      if (!imdbId) return null;
      try {
        const res = await fetch(
          `/api/enrichment/tv-details?imdb_id=${encodeURIComponent(imdbId)}`,
        );
        if (!res.ok) return null;
        const data = (await res.json()) as TVDetailsResponse;
        return data.found ? data : null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(isTV && imdbId && /^tt\d{5,10}$/.test(imdbId)),
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });
}

/**
 * Fetches all episodes for a TV show from TVmaze, including specials (Season 0).
 * Episodes include exact air times, TVmaze URLs, and runtime info.
 *
 * Fail-soft: returns empty list if TVmaze lookup fails.
 */
export function useEnrichedTVEpisodes(imdbId?: string | null, isTV?: boolean) {
  return useQuery<TVEpisodesResponse | null>({
    queryKey: ["tv-episodes-enriched", imdbId],
    queryFn: async () => {
      if (!imdbId) return null;
      try {
        const res = await fetch(
          `/api/enrichment/tv-episodes?imdb_id=${encodeURIComponent(imdbId)}`,
        );
        if (!res.ok) return null;
        return (await res.json()) as TVEpisodesResponse;
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
