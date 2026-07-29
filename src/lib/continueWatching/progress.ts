/**
 * Progress Builder — pure function layer.
 *
 * SINGLE SOURCE OF TRUTH for completion and status derivation.
 *
 * Takes raw Supabase data (followed_shows, watched_episodes) and normalizes
 * it into a single UserShowProgress[] model.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ STATE INVARIANT CONTRACT                                                │
 * │                                                                        │
 * │ 1. Completion is ONLY derived via isDefinitelyCompleted().             │
 * │    No other function may make completion decisions.                    │
 * │                                                                        │
 * │ 2. status is UI-ONLY and derived from completion + activity:           │
 * │    - completed → isDefinitelyCompleted() == true                       │
 * │    - watching  → watchedCount > 0                                      │
 * │    - interested → isFollowed == true                                   │
 * │    - paused    → fallback                                              │
 * │    Status is NEVER used for logic decisions by any layer.              │
 * │                                                                        │
 * │ 3. TMDB data is READ-ONLY METADATA. It never affects:                 │
 * │    - completion decisions                                              │
 * │    - status derivation (after initial build)                           │
 * │    - ranking logic                                                     │
 * │    - inclusion / exclusion rules                                       │
 * │                                                                        │
 * │ 4. No layer may reinterpret completion independently:                  │
 * │    - ranking uses isShowDefinitelyCompleted() (NOT status)             │
 * │    - viewModel maps status directly (NO re-derivation)                 │
 * │    - hook orchestrates but delegates to this module for logic           │
 * │                                                                        │
 * │ 5. WatchedEpisodeCount + TotalEpisodes are the only inputs to          │
 * │    completion. No other fields are involved.                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import type {
  UserShowProgress,
  ShowStatus,
  EpisodeKey,
} from "@/types/continueWatching";
import type { FollowedShow, WatchedEpisode } from "@/hooks/useFollowedShows";
import type { MediaDetails } from "@/types/media";

/**
 * Create a stable episode key: "season-episode"
 */
export function toEpisodeKey(season: number, episode: number): EpisodeKey {
  return `${season}-${episode}`;
}

/**
 * HARD COMPLETION RULE — single source of truth.
 *
 * A show is DEFINITIVELY completed ONLY when:
 *   - totalEpisodes is known (> 0, not null)
 *   - watchedEpisodesCount >= totalEpisodes
 *
 * If TMDB data is missing (null), we CANNOT confirm completion → returns false.
 * This prevents false positives for shows with unknown total episode counts.
 *
 * This is the ONLY function in the entire codebase that determines completion.
 * All other layers call this function; NONE may re-implement the logic.
 * No string comparison ("completed") is ever used for logic decisions.
 */
export function isDefinitelyCompleted(input: {
  watchedEpisodesCount: number;
  totalEpisodes: number | null;
}): boolean {
  if (!input.totalEpisodes || input.totalEpisodes <= 0) return false;
  return input.watchedEpisodesCount >= input.totalEpisodes;
}

/**
 * Convenience overload: accepts a UserShowProgress directly.
 * Used by ranking, hook, and any layer needing completion checks.
 */
export function isShowDefinitelyCompleted(show: UserShowProgress): boolean {
  return isDefinitelyCompleted({
    watchedEpisodesCount: show.watchedEpisodeCount,
    totalEpisodes: show.totalEpisodes,
  });
}

/**
 * Count episodes that should count toward completion right now.
 *
 * This excludes specials and future seasons so completion matches the
 * details page, which only counts published episodes.
 */
export function getPublishedEpisodeTotal(
  details: MediaDetails,
  now: number = Date.now(),
): number | null {
  const seasons = details.seasons;
  if (!seasons || seasons.length === 0) {
    return details.number_of_episodes ?? null;
  }

  const lastReleasedEpisode = details.last_episode_to_air;
  const lastEpisodeHasAired = Boolean(
    lastReleasedEpisode?.air_date &&
      lastReleasedEpisode.season_number > 0 &&
      new Date(lastReleasedEpisode.air_date).getTime() <= now,
  );

  const publishedTotal = seasons.reduce((total, season) => {
    if (season.season_number <= 0) return total;
    if (season.air_date && new Date(season.air_date).getTime() > now) return total;

    // A season summary contains its eventual episode count, including episodes
    // that may not have aired yet. TMDB's last_episode_to_air gives us the
    // exact released boundary, so a user who has watched every available
    // episode reaches 100% immediately instead of being kept at 99%.
    if (lastEpisodeHasAired && lastReleasedEpisode) {
      if (season.season_number > lastReleasedEpisode.season_number) return total;
      if (season.season_number === lastReleasedEpisode.season_number) {
        return total + Math.min(
          season.episode_count || 0,
          Math.max(0, lastReleasedEpisode.episode_number),
        );
      }
    }

    return total + (season.episode_count || 0);
  }, 0);

  return publishedTotal > 0 ? publishedTotal : details.number_of_episodes ?? null;
}

/**
 * Derive a ShowStatus from raw data.
 * Priority: completed > watching > interested > paused.
 *
 * Only called ONCE during buildUserShowProgress. The resulting status is
 * a display label derived from isDefinitelyCompleted(). It is NEVER used
 * for logic decisions — those use isDefinitelyCompleted() directly.
 */
export function deriveStatus(input: {
  watchedCount: number;
  totalEpisodes: number | null;
  isFollowed: boolean;
}): ShowStatus {
  if (isDefinitelyCompleted({ watchedEpisodesCount: input.watchedCount, totalEpisodes: input.totalEpisodes })) return "completed";
  if (input.watchedCount > 0) return "watching";
  if (input.isFollowed) return "interested";
  return "paused";
}

/**
 * MERGE TMDB METADATA into progress objects.
 *
 * This function ONLY merges metadata fields (totalEpisodes, totalSeasons).
 * It does NOT re-derive status. Status is computed ONCE during buildUserShowProgress
 * and is never touched again.
 *
 * TMDB metadata is used by downstream layers:
 * - isDefinitelyCompleted() reads totalEpisodes for completion checks
 * - viewModel.ts uses totalEpisodes for progress percentage
 * - getNextEpisode() uses season/episode data
 *
 * TMDB NEVER influences status, ranking logic, or inclusion/exclusion rules.
 */
export function mergeTMDBMetadata(
  progress: UserShowProgress[],
  details: Map<number, MediaDetails | null>,
): UserShowProgress[] {
  const now = Date.now();
  return progress.map((p) => {
    const d = details.get(p.showId);
    if (!d) return p;

    return {
      ...p,
      totalEpisodes: getPublishedEpisodeTotal(d, now) ?? p.totalEpisodes,
      totalSeasons: d.number_of_seasons ?? p.totalSeasons,
      // Note: status is NOT re-derived here. The original buildUserShowProgress
      // status is preserved. Completion detection via isDefinitelyCompleted()
      // reads totalEpisodes directly, not the status string.
    };
  });
}

/**
 * Build the unified UserShowProgress[] from the three Supabase data sources.
 *
 * Merges by showId:
 * - All watch events from watched_episodes
 * - Follow status from followed_shows
 * - Explicit status from user_watched (overridden by deterministic completion)
 *
 * Status is computed ONCE here via deriveStatus(). It is a DERIVED LABEL,
 * never a source of truth. All completion logic uses isDefinitelyCompleted().
 */
export function buildUserShowProgress(input: {
  followedShows: FollowedShow[];
  watchedEpisodes: WatchedEpisode[];
  totalEpisodes?: Map<number, number>;
  totalSeasons?: Map<number, number>;
}): UserShowProgress[] {
  const { followedShows, watchedEpisodes } = input;
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

    // Status is derived ONCE here. It's a display label, not logic.
    const status = deriveStatus({
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
