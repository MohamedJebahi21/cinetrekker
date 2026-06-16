/**
 * Orchestrator Hook — pipeline coordinator for Continue Watching.
 *
 * Pipeline:
 * 1. Fetch raw Supabase data (followed_shows, watched_episodes)
 * 2. Build UserShowProgress[] via progress.ts (pure, status derived ONCE)
 * 3. Rank shows via ranking.ts (pure, uses isShowDefinitelyCompleted)
 * 4. Batch-resolve TMDB details + seasons (parallel, cached)
 * 5. Merge TMDB metadata via progress.ts (pure, NO status re-derivation)
 * 6. Build ContinueWatchingVM[] via viewModel.ts (pure mapping, NO logic)
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ HOOK SAFETY RULES (anti-drift)                                          │
 * │                                                                        │
 * │ This file orchestrates the pipeline. It does NOT own any business logic.│
 * │                                                                        │
 * │ FORBIDDEN in this file:                                                 │
 * │   - isDefinitelyCompleted() calls (belongs in progress.ts)              │
 * │   - watchedEpisodesCount >= totalEpisodes logic                         │
 * │   - status string comparisons for logic decisions                       │
 * │   - completion detection or re-derivation                               │
 * │   - TMDB-based completion inference                                     │
 * │                                                                        │
 * │ ALLOWED in this file:                                                   │
 * │   - mergeTMDBMetadata() call (delegates to progress.ts)                 │
 * │   - rankShows() call (delegates to ranking.ts)                          │
 * │   - buildContinueWatchingVM() call (delegates to viewModel.ts)          │
 * │   - Intent-based inclusion filter (isFollowed || lastActivityAt)        │
 * │                                                                        │
 * │ Inclusion filter inputs (the ONLY allowed inputs):                      │
 * │   - isFollowed: user intent (follow action)                             │
 * │   - lastActivityAt: activity presence (not watchedEpisodeCount)         │
 * │   - TMDB metadata is NOT used for inclusion/exclusion decisions         │
 * │                                                                        │
 * │ If a future developer adds:                                             │
 * │   - status string comparisons → BUG: status is display-only             │
 * │   - completion re-derivation → BUG: progress.ts owns this              │
 * │   - TMDB-based filtering → BUG: TMDB is metadata-only                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  useFollowedShows,
  useWatchedEpisodes,
} from "@/hooks/useFollowedShows";
import { buildUserShowProgress, mergeTMDBMetadata } from "@/lib/continueWatching/progress";
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
  const { i18n } = useTranslation();
  const language = i18n.language;
  const { user } = useAuth();
  const { followedShows } = useFollowedShows();
  const { watchedEpisodes } = useWatchedEpisodes();

  // 1. Build unified progress model (pure, no TMDB)
  //    Status is derived ONCE here via deriveStatus() in progress.ts.
  //    It is a display label only — never used for logic decisions.
  const progress = useMemo(
    () =>
      buildUserShowProgress({
        followedShows,
        watchedEpisodes,
      }),
    [followedShows, watchedEpisodes],
  );

  // 2. Rank (pure, no TMDB, excludes completed via isShowDefinitelyCompleted)
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
          if (!d) return null;
          return { showId: s.showId, seasonNumber };
        })
        .filter(Boolean) as Array<{ showId: number; seasonNumber: number }>;

      const seen = new Set<string>();
      const uniqueSeasonReqs = seasonRequests.filter((r) => {
        const key = `${r.showId}-${r.seasonNumber}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const seasons = await batchResolveSeasons(uniqueSeasonReqs, language);

      // 4c. Merge TMDB metadata into progress (totals only, NO status re-derivation)
      const mergedProgress = mergeTMDBMetadata(ranked, details);

      // 4d. Build view model (pure mapping, NO logic)
      const vms = mergedProgress
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
        // 4e. Intent-based inclusion:
        //     - Shows with activity history (partial sync-safe, not tied to watched count)
        //     - Followed shows even if activity is zero (user intent > sync state)
        //     This handles partial sync states where watchedEpisodes might be
        //     temporarily empty but the user has explicitly expressed intent.
        .filter((vm) => vm.isFollowed || vm.lastActivityAt != null);

      return vms;
    },
    enabled: ranked.length > 0 && !!user,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ?? null,
    refetch: () => query.refetch(),
  };
}