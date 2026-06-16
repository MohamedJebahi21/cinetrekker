/**
 * Next-Episode Resolver — pure function.
 *
 * Computes the next unwatchable+released episode for a show
 * given the user's progress and TMDB season data.
 *
 * Handles:
 * - Season transitions (S3 → S4)
 * - Specials (S0) — skipped
 * - Unreleased episodes — skipped, flagged as upcoming
 * - Missing air_date — treated as unreleased
 * - TMDB next_episode_to_air fallback
 */

import type {
  EpisodeKey,
  TMDBEpisodeLite,
  TMDBSeasonLite,
  NextEpisodeResult,
} from "@/types/continueWatching";

export interface NextEpisodeInput {
  /** The user's last-watched episode, or null if none. */
  lastWatched: { season: number; episode: number } | null;
  /** Set of watched episode keys: "season-episode". */
  watchedSet: Set<EpisodeKey>;
  /** All seasons for this show from TMDB (excluding S0). */
  seasons: TMDBSeasonLite[];
  /** Episodes keyed by season number. Only the relevant season(s) need to be populated. */
  episodesBySeason: Record<number, TMDBEpisodeLite[]>;
  /** Show-level details from TMDB. */
  details: {
    number_of_episodes?: number;
    number_of_seasons?: number;
    next_episode_to_air?: TMDBEpisodeLite | null;
    in_production?: boolean;
    status?: string;
  };
  /** Allow override for testing. Defaults to Date.now(). */
  now?: number;
}

/**
 * Check if an episode is released (air_date <= today).
 */
function isReleased(airDate: string | null | undefined, now: number): boolean {
  if (!airDate) return false;
  return new Date(airDate).getTime() <= now;
}

/**
 * Format the watch key for a set lookup.
 */
function watchKey(s: number, e: number): EpisodeKey {
  return `${s}-${e}`;
}

/**
 * Skip season 0 (specials) and unreleased seasons.
 */
function isValidSeason(season: TMDBSeasonLite, now: number): boolean {
  if (season.season_number === 0) return false;
  if (!season.air_date) return true; // unknown → assume valid
  return new Date(season.air_date).getTime() <= now;
}

/**
 * Find the first released + unwatched episode in a season.
 */
function findInSeason(
  seasonNumber: number,
  episodes: TMDBEpisodeLite[],
  watchedSet: Set<EpisodeKey>,
  now: number,
): TMDBEpisodeLite | null {
  const sorted = [...episodes].sort(
    (a, b) => a.episode_number - b.episode_number,
  );

  for (const ep of sorted) {
    if (ep.season_number === 0) continue;
    if (ep.episode_number === 0) continue;
    if (!isReleased(ep.air_date, now)) continue;
    if (!watchedSet.has(watchKey(ep.season_number, ep.episode_number))) {
      return ep;
    }
  }

  return null;
}

/**
 * Pure function: compute the next episode the user should watch.
 *
 * Algorithm:
 * 1. Start from the last-watched season, or S1 if none.
 * 2. If last season is fully watched, move to next season.
 * 3. If no next season exists, fall back to TMDB's `next_episode_to_air`.
 * 4. If that's also null, return null (show is caught up or over).
 */
export function getNextEpisode(input: NextEpisodeInput): NextEpisodeResult | null {
  const now = input.now ?? Date.now();
  const { lastWatched, watchedSet, seasons, episodesBySeason } = input;

  // Filter to valid, released seasons
  const validSeasons = seasons.filter((s) => isValidSeason(s, now));
  const candidateStartSeason = lastWatched?.season ?? 1;

  // Try seasons in order: start from last-watched (or S1), then iterate
  const seasonsToCheck = validSeasons
    .filter((s) => s.season_number >= candidateStartSeason)
    .sort((a, b) => a.season_number - b.season_number);

  // If we have a last-watched, also check the same season first
  const exactSeason = seasonsToCheck.find(
    (s) => s.season_number === candidateStartSeason,
  );
  const checkOrder = exactSeason
    ? [exactSeason, ...seasonsToCheck.filter((s) => s.season_number !== candidateStartSeason)]
    : seasonsToCheck;

  for (const season of checkOrder) {
    const eps = episodesBySeason[season.season_number];
    if (!eps || eps.length === 0) continue;

    const found = findInSeason(season.season_number, eps, watchedSet, now);
    if (found) {
      return {
        episode: found,
        isUpcoming: false,
        fromSeason: season.season_number,
      };
    }
  }

  // Season-by-season search failed — try next_episode_to_air fallback
  if (input.details.next_episode_to_air) {
    const next = input.details.next_episode_to_air;
    return {
      episode: next,
      isUpcoming: !isReleased(next.air_date, now),
      fromSeason: next.season_number,
    };
  }

  return null;
}