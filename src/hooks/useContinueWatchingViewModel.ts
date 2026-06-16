/**
 * Orchestrator Hook — the single source of truth for Continue Watching.
 *
 * Pipeline:
 * 1. Fetch raw Supabase data (followed_shows, watched_episodes, user_watched)
 * 2. Build UserShowProgress[] (pure)
 * 3. Rank shows by score (pure)
 * 4. Batch-resolve TMDB details + seasons (parallel, cached)
 * 5. Build ContinueWatchingVM[] (pure)
 *
 * No business logic in the component. No N+1 TMDB calls.
 * Stable query keys via FNV-1a hash.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  useFollowedShows,
  useWatchedEpisodes,
} from "@/hooks/useFollowedShows";
import { useWatchedQuery } from "@/hooks/useWatchedQueries";
import { buildUserShowProgress } from "@/lib/continueWatching/progress";
import { rankShows } from "@/lib/continueWatching/ranking";
import { buildContinueWatchingVM } from "@/lib/continueWatching/viewModel";
import {
  batchResolveTVDetails,
  batchResolveSeasons,
} from "@/lib/continueWatching/tmdbResolver";
import type { ContinueWatchingVM } from "@/types/continueWatching";

/**
 * Stable FNV-1a hash of an array of numbers.
 * Avoids React Query re-fetching when array identity changes.
 */
function hashIds(ids: number[]): string {
  let h = 2166136261 >>> 0;
  const sorted = [...ids].sort((a, b) => a - b);
  for (const id of sorted) {
    h ^= id;
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16);
}

/**
 * Stable hash of watched episode tuples (show, season, episode, timestamp).
 */
function hashWatched(
  eps: Array<{ show_id: number; season_number: number; episode_number: number; watched_at: string }>,
): string {
  let h = 2166136261 >>> 0;
  // Sort for stability
  const sorted = [...eps].sort((a, b) => {
    if (a.show_id !== b.show_id) return a.show_id - b.show_id;
    if (a.season_number !== b.season_number) return a.season_number - b.season_number;
    return a.episode_number - b.episode_number;
  });
  for (const e of sorted) {
    const s = `${e.show_id},${e.season_number},${e.episode_number},${e.watched_at}`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
  }
  return h.toString(16);
}

export function useContinueWatchingViewModel(): {
  data: ContinueWatchingVM[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { user } = useAuth();
  const { followedShows } = useFollowedShows();
  const { watchedEpisodes } = useWatchedEpisodes();
  const { data: watchedItems = [] } = useWatchedQuery();

  // 1. Build unified progress model (pure, no TMDB)
  const progress = useMemo(
    () =>
      buildUserShowProgress({
        followedShows,
        watchedEpisodes,
        explicitStatuses: new Map(
          watchedItems
            .filter((i) => i.mediaType === "tv")
            .map((i) => [i.mediaId, i.status ?? ""]),
        ),
      }),
    [followedShows, watchedEpisodes, watchedItems],
  );

  // 2. Rank (pure, no TMDB, excludes completed shows)
  const ranked = useMemo(() => rankShows(progress, { limit: 50 }), [progress]);

  // 3. Stable hashes for query key — prevents re-fetching on every render
  const idsHash = hashIds(ranked.map((s) => s.showId));
  const watchedHash = hashWatched(watchedEpisodes);
  const followedHash = hashIds(followedShows.map((f) => f.show_id));

  // 4. Orchestrated TMDB fetch + view model build
  const query = useQuery({
    queryKey: [
      "continue-watching-vm",
      language,
      idsHash,
      watchedHash,
      followedHash,
    ],
    queryFn: async (): Promise<ContinueWatchingVM[]> => {
      if (ranked.length === 0) return [];

      // 4a. Batch-resolve all TV details in a single parallel wave
      const details = await batchResolveTVDetails(
        ranked.map((s) => s.showId),
        language,
      );

      // 4b. Fetch the season we need for each show (only the relevant season)
      const seasonRequests = ranked
        .map((s) => {
          const d = details.get(s.showId);
          const seasonNumber = s.lastWatchedEpisode?.season ?? 1;
          // Only fetch if we have TMDB data for the show
          if (!d) return null;
          return { showId: s.showId, seasonNumber };
        })
        .filter(Boolean) as Array<{ showId: number; seasonNumber: number }>;

      // Deduplicate season requests (multiple shows may request same season)
      const seen = new Set<string>();
      const uniqueSeasonReqs = seasonRequests.filter((r) => {
        const key = `${r.showId}-${r.seasonNumber}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const seasons = await batchResolveSeasons(uniqueSeasonReqs, language);

      // 4c. Build view model
      return ranked
        .map((p) => {
          const d = details.get(p.showId);
          const seasonKey = `season:${p.showId}:${p.lastWatchedEpisode?.season ?? 1}:${language}`;
          const season = seasons.get(seasonKey);

          const episodesBySeason: Record<
            number,
            Array<{
              season_number: number;
              episode_number: number;
              name?: string;
              air_date?: string | null;
              runtime?: number | null;
              overview?: string;
              still_path?: string | null;
              vote_average?: number;
            }>
          > = {};

          if (season?.episodes) {
            const seasonNum = p.lastWatchedEpisode?.season ?? 1;
            episodesBySeason[seasonNum] = season.episodes.map(
              (ep: {
                season_number: number;
                episode_number: number;
                name?: string;
                air_date?: string | null;
                runtime?: number | null;
                overview?: string;
                still_path?: string | null;
                vote_average?: number;
              }) => ({
                season_number: ep.season_number,
                episode_number: ep.episode_number,
                name: ep.name,
                air_date: ep.air_date,
                runtime: ep.runtime,
                overview: ep.overview,
                still_path: ep.still_path,
                vote_average: ep.vote_average,
              }),
            );
          }

          return buildContinueWatchingVM({
            progress: p,
            details: d ?? null,
            episodesBySeason,
          });
        })
        .filter((vm) => vm.watchedEpisodeCount > 0);
    },
    enabled: ranked.length > 0 && !!user,
    staleTime: 60_000, // 1 minute — fast enough for "just marked" to show
    gcTime: 5 * 60_000, // 5 minutes
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ?? null,
    refetch: () => query.refetch(),
  };
}