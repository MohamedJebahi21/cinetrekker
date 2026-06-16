/**
 * View Model Builder — pure function.
 *
 * Combines UserShowProgress + TMDB data → ContinueWatchingVM.
 *
 * This is the final transformation step before the React UI.
 * Everything in here is pure — no side effects, no hooks, no fetch.
 */

import type {
  UserShowProgress,
  ContinueWatchingVM,
  ShowStatus,
} from "@/types/continueWatching";
import type { MediaDetails } from "@/types/media";
import { getNextEpisode } from "./nextEpisode";

/**
 * Build a ContinueWatchingVM from progress + TMDB data.
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

  // --- Progress percentage ---
  const totalEpisodes = details?.number_of_episodes ?? progress.totalEpisodes;
  const progressPercent =
    totalEpisodes && totalEpisodes > 0
      ? Math.min(99, Math.round((progress.watchedEpisodeCount / totalEpisodes) * 100))
      : Math.min(95, Math.max(5, progress.watchedEpisodeCount * 10));

  // --- Next episode resolution ---
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

  // --- Slug-based href ---
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
    nextEpisodeName: nextEpisode?.name ?? null,
    nextEpisodeAirDate: nextEpisode?.air_date ?? null,
    nextEpisodeIsUpcoming: nextResult?.isUpcoming ?? false,
    watchedEpisodeCount: progress.watchedEpisodeCount,
    progressPercent,
    status: deriveDisplayStatus(progress.status, progress.watchedEpisodeCount, totalEpisodes),
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

/**
 * Determine the display status, ensuring "completed" is only shown
 * when we have actual data to confirm it.
 */
function deriveDisplayStatus(
  status: ShowStatus,
  watchedCount: number,
  totalEpisodes: number | null,
): ShowStatus {
  if (totalEpisodes && totalEpisodes > 0 && watchedCount >= totalEpisodes) {
    return "completed";
  }
  return status;
}