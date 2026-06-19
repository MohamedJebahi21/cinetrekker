/**
 * View Model Builder — pure function, NO business logic.
 *
 * Combines UserShowProgress + TMDB data → ContinueWatchingVM.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ VIEW MODEL RULES (anti-drift)                                           │
 * │                                                                        │
 * │ This file is a PURE MAPPING LAYER only.                                │
 * │                                                                        │
 * │ FORBIDDEN in this file:                                                 │
 * │   - isDefinitelyCompleted() calls (that belongs in progress.ts)         │
 * │   - watchedEpisodesCount >= totalEpisodes logic                         │
 * │   - status string comparisons for logic decisions                       │
 * │   - completion detection or re-derivation of any kind                   │
 * │   - inclusion / exclusion filtering logic                               │
 * │   - TMDB metadata interpretation beyond display                         │
 * │                                                                        │
 * │ ALLOWED in this file:                                                   │
 * │   - progress.status pass-through (display label, not logic)             │
 * │   - totalEpisodes for progress % display only                           │
 * │   - isFollowed and lastActivityAt pass-through                          │
 * │   - episode/season data for next-episode display                        │
 * │                                                                        │
 * │ Completion is determined by progress.ts.                                │
 * │ This file transforms data shapes only.                                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import type {
  UserShowProgress,
  ContinueWatchingVM,
} from "@/types/continueWatching";
import type { MediaDetails } from "@/types/media";
import { getNextEpisode } from "./nextEpisode";

/**
 * Build a ContinueWatchingVM from progress + TMDB data.
 *
 * Pure mapping — no logic decisions. Just transforms data shapes.
 */
export function buildContinueWatchingVM(params: {
  progress: UserShowProgress;
  details: MediaDetails | null;
  episodesBySeason: Record<number, Array<{
    season_number: number;
    episode_number: number;
    name?: string;
    air_date?: string | null;
    runtime?: number | null;
    overview?: string;
    still_path?: string | null;
    vote_average?: number;
  }>>;
}): ContinueWatchingVM {
  const { progress, details, episodesBySeason } = params;

  // Use TMDB total if available, fallback to progress
  const totalEpisodes = details?.number_of_episodes ?? progress.totalEpisodes;

  // Progress percentage (display only, no status inference)
  const progressPercent =
    totalEpisodes && totalEpisodes > 0
      ? Math.min(99, Math.round((progress.watchedEpisodeCount / totalEpisodes) * 100))
      : Math.min(95, Math.max(5, progress.watchedEpisodeCount * 10));

  // Next episode resolution (display only)
  const nextResult = details
    ? getNextEpisode({
        lastWatched: progress.lastWatchedEpisode,
        watchedSet: progress.watchedEpisodes,
        seasons:
          details.seasons?.filter((s) => s.season_number !== 0) ?? [],
        episodesBySeason,
        details: {
          number_of_episodes: details.number_of_episodes,
          number_of_seasons: details.number_of_seasons,
          next_episode_to_air: details.next_episode_to_air ?? null,
          in_production: details.in_production,
          status: details.status,
        },
      })
    : null;

  const nextEpisode = nextResult?.episode ?? null;
  const nextEpisodeLabel = nextEpisode
    ? `S${nextEpisode.season_number}E${nextEpisode.episode_number}`
    : null;

  // Slug-based href
  const showName = details?.name ?? progress.showName;
  const href = `/tv/${slugify(showName)}-${progress.showId}`;

  return {
    showId: progress.showId,
    title: showName,
    posterPath: details?.poster_path ?? progress.posterPath,
    href,
    hrefLabel: showName,
    lastWatchedEpisode: progress.lastWatchedEpisode,
    nextEpisodeLabel,
    nextEpisodeSeasonNumber: nextEpisode?.season_number ?? null,
    nextEpisodeNumber: nextEpisode?.episode_number ?? null,
    nextEpisodeName: nextEpisode?.name ?? null,
    nextEpisodeAirDate: nextEpisode?.air_date ?? null,
    nextEpisodeIsUpcoming: nextResult?.isUpcoming ?? false,
    watchedEpisodeCount: progress.watchedEpisodeCount,
    progressPercent,
    // Status is a display label from progress.ts — never used for logic.
    status: progress.status,
    // Passed through for downstream filtering in the hook.
    isFollowed: progress.isFollowed,
    lastActivityAt: progress.lastActivityAt,
  };
}

/**
 * Simple slugify that matches src/lib/seo.ts logic.
 */
function slugify(value: string): string {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
