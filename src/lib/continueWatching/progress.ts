/**
 * Progress Builder — pure function layer.
 *
 * Takes raw Supabase data (followed_shows, watched_episodes, user_watched)
 * and normalizes it into a single UserShowProgress[] model.
 *
 * This is the first step in the pipeline and requires zero TMDB data.
 */

import type {
  UserShowProgress,
  ShowStatus,
  EpisodeKey,
} from "@/types/continueWatching";
import type { FollowedShow, WatchedEpisode } from "@/hooks/useFollowedShows";

/**
 * Create a stable episode key: "season-episode"
 */
export function toEpisodeKey(season: number, episode: number): EpisodeKey {
  return `${season}-${episode}`;
}

/**
 * Determine if a show is completed based on actual episode counts,
 * NOT on a user-set status field. This ensures we never hide a show
 * that the user still has episodes to watch.
 */
export function isCompleted(
  watchedCount: number,
  totalEpisodes: number | null,
): boolean {
  if (totalEpisodes != null && totalEpisodes > 0) {
    return watchedCount >= totalEpisodes;
  }
  // If we don't know the total, assume not completed.
  return false;
}

/**
 * Derive a ShowStatus from raw data, with completion override.
 * Priority: completed > watching > interested > paused.
 */
export function deriveStatus(input: {
  explicitStatus?: string;
  watchedCount: number;
  totalEpisodes: number | null;
  isFollowed: boolean;
}): ShowStatus {
  if (isCompleted(input.watchedCount, input.totalEpisodes)) return "completed";
  if (input.watchedCount > 0) return "watching";
  if (input.isFollowed) return "interested";
  return "paused";
}

/**
 * Build the unified UserShowProgress[] from the three Supabase data sources.
 *
 * Merges by showId:
 * - All watch events from watched_episodes
 * - Follow status from followed_shows
 * - Explicit status from user_watched (overridden by deterministic completion)
 */
export function buildUserShowProgress(input: {
  followedShows: FollowedShow[];
  watchedEpisodes: WatchedEpisode[];
  explicitStatuses: Map<number, string>;
  totalEpisodes?: Map<number, number>;
  totalSeasons?: Map<number, number>;
}): UserShowProgress[] {
  const { followedShows, watchedEpisodes, explicitStatuses } = input;
  const totals = input.totalEpisodes ?? new Map();
  const seasons = input.totalSeasons ?? new Map();

  // Group watched episodes by showId, sorted chronologically
  const episodesByShow = new Map<number, WatchedEpisode[]>();
  for (const ep of watchedEpisodes) {
    const list = episodesByShow.get(ep.show_id);
    if (list) {
      list.push(ep);
    } else {
      episodesByShow.set(ep.show_id, [ep]);
    }
  }

  // Sort each show's episodes by (season, episode, watched_at)
  for (const [, list] of episodesByShow) {
    list.sort((a, b) => {
      if (a.season_number !== b.season_number) return a.season_number - b.season_number;
      if (a.episode_number !== b.episode_number) return a.episode_number - b.episode_number;
      return new Date(a.watched_at).getTime() - new Date(b.watched_at).getTime();
    });
  }

  // Index followed shows by showId for O(1) lookup
  const followIndex = new Map<number, FollowedShow>();
  for (const f of followedShows) {
    followIndex.set(f.show_id, f);
  }

  // Collect all unique show IDs from both sources
  const allShowIds = new Set<number>([...episodesByShow.keys(), ...followIndex.keys()]);

  const result: UserShowProgress[] = [];

  for (const showId of allShowIds) {
    const showEps = episodesByShow.get(showId) ?? [];
    const follow = followIndex.get(showId);

    const watchedCount = showEps.length;
    const lastEp = showEps.length > 0 ? showEps[showEps.length - 1] : null;
    const explicitStatus = explicitStatuses.get(showId) ?? "";
    const totalEps = totals.get(showId) ?? null;
    const totalSeasonsCount = seasons.get(showId) ?? null;

    // Find the latest activity timestamp
    const watchedAt = lastEp?.watched_at ?? null;
    const followedAt = follow?.followed_at ?? null;
    const lastActivityAt =
      watchedAt && followedAt
        ? watchedAt > followedAt
          ? watchedAt
          : followedAt
        : (watchedAt ?? followedAt ?? new Date(0).toISOString());

    // Build set of watched episode keys for fast lookup
    const watchedKeys = new Set<EpisodeKey>();
    for (const ep of showEps) {
      watchedKeys.add(toEpisodeKey(ep.season_number, ep.episode_number));
    }

    const status = deriveStatus({
      explicitStatus,
      watchedCount,
      totalEpisodes: totalEps,
      isFollowed: !!follow,
    });

    result.push({
      showId,
      showName: follow?.show_name ?? `Show ${showId}`,
      posterPath: follow?.poster_path ?? null,
      status,
      watchedEpisodes: watchedKeys,
      lastWatchedEpisode:
        lastEp ? { season: lastEp.season_number, episode: lastEp.episode_number } : null,
      lastActivityAt,
      isFollowed: !!follow,
      watchedEpisodeCount: watchedCount,
      totalEpisodes: totalEps,
      totalSeasons: totalSeasonsCount,
    });
  }

  // Sort by lastActivityAt descending so the most-recently-active shows come first
  result.sort((a, b) => {
    const aTs = new Date(a.lastActivityAt).getTime();
    const bTs = new Date(b.lastActivityAt).getTime();
    return bTs - aTs;
  });

  return result;
}