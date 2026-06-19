/**
 * Unified, normalized types for the Continue Watching system.
 * Eliminates the mixed follow/watch/status model.
 */

/** Deterministic show status derived from actual progress data. */
export type ShowStatus = "interested" | "watching" | "paused" | "completed";

/** Composite key for a specific episode: "seasonNumber-episodeNumber" */
export type EpisodeKey = `${number}-${number}`;

/**
 * Single unified progress model for a TV show.
 * This is built from the Supabase hooks (followed_shows + watched_episodes + user_watched)
 * but normalizes them into a single authoritative shape.
 */
export interface UserShowProgress {
  showId: number;
  showName: string;
  posterPath: string | null;
  status: ShowStatus;
  watchedEpisodes: Set<EpisodeKey>;
  lastWatchedEpisode: { season: number; episode: number } | null;
  lastActivityAt: string; // ISO-8601
  isFollowed: boolean;
  watchedEpisodeCount: number;
  /** Populated later from TMDB if available, null if unknown. */
  totalEpisodes: number | null;
  /** Populated later from TMDB if available, null if unknown. */
  totalSeasons: number | null;
}

/**
 * A thin, batched representation of a TMDB season for the resolver.
 * We only need episode count and air dates for next-episode computation.
 */
export interface TMDBSeasonLite {
  season_number: number;
  episode_count?: number;
  air_date?: string | null;
}

export interface TMDBEpisodeLite {
  season_number: number;
  episode_number: number;
  name?: string;
  air_date?: string | null;
  runtime?: number | null;
  overview?: string;
  still_path?: string | null;
  vote_average?: number;
}

/**
 * The output of the Next-Episode resolver.
 */
export interface NextEpisodeResult {
  episode: TMDBEpisodeLite;
  isUpcoming: boolean;
  fromSeason: number;
}

/**
 * Final view model consumed by the React UI.
 * No TMDB internals, no hooks — just display-ready data.
 */
export interface ContinueWatchingVM {
  showId: number;
  title: string;
  posterPath: string | null;
  href: string; // slug-based route e.g. /tv/game-of-thrones-1399
  hrefLabel: string;
  lastWatchedEpisode: { season: number; episode: number } | null;
  nextEpisodeLabel: string | null; // "S3E5"
  nextEpisodeSeasonNumber: number | null;
  nextEpisodeNumber: number | null;
  nextEpisodeName: string | null;
  nextEpisodeAirDate: string | null; // formatted date
  nextEpisodeIsUpcoming: boolean;
  watchedEpisodeCount: number;
  progressPercent: number; // 0-100
  status: ShowStatus;
  /** Whether the user has explicitly followed this show. */
  isFollowed: boolean;
  /** Most recent activity timestamp, ISO-8601. Used for filtering. */
  lastActivityAt: string | null;
}

/** Stable hash type for cache keys. */
export type StableHash = string;
