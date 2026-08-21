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
 * │   - Episode-activity inclusion filter (watchedEpisodeCount > 0)         │
 * │                                                                        │
 * │ Inclusion filter inputs (the ONLY allowed inputs):                      │
 * │   - watchedEpisodeCount: user actually watched at least one episode     │
 * │   - TMDB metadata is NOT used for inclusion/exclusion decisions         │
 * │                                                                        │
 * │ If a future developer adds:                                             │
 * │   - status string comparisons → BUG: status is display-only             │
 * │   - completion re-derivation → BUG: progress.ts owns this              │
 * │   - TMDB-based filtering → BUG: TMDB is metadata-only                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import { useEffect, useMemo, useRef } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  useFollowedShows,
  useWatchedEpisodes,
} from "@/hooks/useFollowedShows";
import { useWatchedQuery } from "@/hooks/useWatchedQueries";
import {
  buildUserShowProgress,
  getShowsToMarkCompleted,
  getShowsToReopen,
  isShowDefinitelyCompleted,
  mergeTMDBMetadata,
} from "@/lib/continueWatching/progress";
import { syncTvCompletionStatuses } from "@/lib/continueWatching/syncTvCompletionStatus";
import { rankShows } from "@/lib/continueWatching/ranking";
import { buildContinueWatchingVM } from "@/lib/continueWatching/viewModel";
import {
  batchResolveTVDetails,
  batchResolveSeasons,
} from "@/lib/continueWatching/tmdbResolver";
import type { ContinueWatchingVM } from "@/types/continueWatching";

/** Only fetch season episode lists for the top-ranked cards. */
const SEASON_FETCH_LIMIT = 12;

interface ContinueWatchingQueryResult {
  vms: ContinueWatchingVM[];
  toComplete: number[];
  toReopen: number[];
}

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
  const queryClient = useQueryClient();
  const syncedCompletionKeyRef = useRef<string | null>(null);
  const { followedShows } = useFollowedShows();
  const { watchedEpisodes } = useWatchedEpisodes();
  const { data: watchedItems = [], isLoading: watchedItemsLoading } = useWatchedQuery();

  const completedShowIds = useMemo(
    () =>
      new Set(
        watchedItems
          .filter((item) => item.mediaType === "tv" && item.status === "completed")
          .map((item) => item.mediaId),
      ),
    [watchedItems],
  );

  const allProgress = useMemo(
    () =>
      buildUserShowProgress({
        followedShows,
        watchedEpisodes,
      }),
    [followedShows, watchedEpisodes],
  );

  // 1. Build unified progress model (pure, no TMDB)
  //    Status is derived ONCE here via deriveStatus() in progress.ts.
  //    It is a display label only — never used for logic decisions.
  const progress = useMemo(
    () =>
      allProgress.filter(
        (show) =>
          show.watchedEpisodeCount > 0 &&
          !completedShowIds.has(show.showId),
      ),
    [allProgress, completedShowIds],
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
      [...completedShowIds].sort((a, b) => a - b).join(","),
    ],
    queryFn: async (): Promise<ContinueWatchingQueryResult> => {
      if (ranked.length === 0) {
        return { vms: [], toComplete: [], toReopen: [] };
      }

      const reopenCandidates = allProgress.filter(
        (show) =>
          show.watchedEpisodeCount > 0 && completedShowIds.has(show.showId),
      );
      const detailShowIds = Array.from(
        new Set([
          ...ranked.map((show) => show.showId),
          ...reopenCandidates.map((show) => show.showId),
        ]),
      );

      // 4a. Batch-resolve all TV details in a single parallel wave
      const details = await batchResolveTVDetails(detailShowIds, language);

      const rankedMerged = mergeTMDBMetadata(ranked, details);
      const reopenMerged = mergeTMDBMetadata(reopenCandidates, details);
      const toComplete = getShowsToMarkCompleted(rankedMerged, completedShowIds);
      const toReopen = getShowsToReopen(reopenMerged, completedShowIds);

      // 4b. Fetch seasons only for top-ranked cards to limit TMDB fan-out
      const seasonFetchTargets = ranked.slice(0, SEASON_FETCH_LIMIT);
      const seasonRequests: Array<{ showId: number; seasonNumber: number }> = [];
      for (const s of seasonFetchTargets) {
        const d = details.get(s.showId);
        if (!d) continue;
        const lastSeason = s.lastWatchedEpisode?.season ?? 1;
        const maxSeason = d.number_of_seasons ?? lastSeason + 1;
        seasonRequests.push({ showId: s.showId, seasonNumber: lastSeason });
        const nextSeason = lastSeason + 1;
        if (nextSeason > 0 && nextSeason <= maxSeason) {
          seasonRequests.push({ showId: s.showId, seasonNumber: nextSeason });
        }
      }

      const seen = new Set<string>();
      const uniqueSeasonReqs = seasonRequests.filter((r) => {
        const key = `${r.showId}-${r.seasonNumber}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const seasons = await batchResolveSeasons(uniqueSeasonReqs, language);

      // 4c. Merge TMDB metadata into progress (totals only, NO status re-derivation)
      const mergedProgress = rankedMerged.filter(
        (show) =>
          show.watchedEpisodeCount > 0 &&
          !isShowDefinitelyCompleted(show) &&
          !completedShowIds.has(show.showId),
      );

      const seasonFetchIds = new Set(seasonFetchTargets.map((show) => show.showId));

      // 4d. Build view model (pure mapping, NO logic)
      const vms = mergedProgress
        .map((p) => {
          const d = details.get(p.showId);
          const startSeason = p.lastWatchedEpisode?.season ?? 1;
          const maxSeason = d?.number_of_seasons ?? startSeason + 1;
          const hasSeasonData = seasonFetchIds.has(p.showId);

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

          for (
            let seasonNum = startSeason;
            hasSeasonData && seasonNum <= Math.min(startSeason + 1, maxSeason);
            seasonNum++
          ) {
            const seasonKey = `season:${p.showId}:${seasonNum}:${language}`;
            const season = seasons.get(seasonKey);
            if (!season?.episodes) continue;

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

          return {
            ...buildContinueWatchingVM({
              progress: p,
              details: d ?? null,
              episodesBySeason,
            }),
            needsSeasonEnrichment: !hasSeasonData,
          };
        })
        // 4e. Episode-driven inclusion:
        //     - Require at least one watched episode
        //     - Exclude anything already completed by episode totals or explicit status
        .filter(
          (vm) =>
            vm.watchedEpisodeCount > 0 &&
            !completedShowIds.has(vm.showId) &&
            !vm.isFinished,
        );

      return { vms, toComplete, toReopen };
    },
    enabled: ranked.length > 0 && !!user && !watchedItemsLoading,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    // Marking an episode changes watchedHash and therefore rekeys this query.
    // Keep the current rail mounted while the updated view model resolves.
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!user?.id || !query.data) return;

    const { toComplete, toReopen } = query.data;
    if (toComplete.length === 0 && toReopen.length === 0) return;

    const syncKey = `${toComplete.join(",")}|${toReopen.join(",")}`;
    if (syncedCompletionKeyRef.current === syncKey) return;

    let cancelled = false;
    void (async () => {
      try {
        await syncTvCompletionStatuses({
          userId: user.id,
          toComplete,
          toReopen,
        });
        if (cancelled) return;
        syncedCompletionKeyRef.current = syncKey;
        await queryClient.invalidateQueries({ queryKey: ["watched", user.id] });
      } catch {
        // Best-effort sync; the next pipeline run will retry.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query.data, queryClient, user?.id]);

  // Guard against briefly rendering a stale query result while React Query
  // refreshes after a user marks a title complete. Completion is authoritative:
  // a completed series never belongs in Continue Watching, regardless of the
  // number of individually tracked episode rows.
  const data = useMemo(
    () =>
      query.data?.vms.filter(
        (show) => !completedShowIds.has(show.showId) && !show.isFinished,
      ),
    [completedShowIds, query.data?.vms],
  );

  return {
    data,
    // Preserve the populated rail during a mutation-driven rekey; initial
    // loading remains visible only when no current or placeholder data exists.
    isLoading: (query.isLoading && !query.data) || watchedItemsLoading,
    error: query.error ?? null,
    refetch: () => query.refetch(),
  };
}
