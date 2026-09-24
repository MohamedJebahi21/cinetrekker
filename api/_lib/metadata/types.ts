/**
 * Unified Metadata Layer Contracts
 *
 * Provider-agnostic domain models, provider abstractions,
 * and future streaming provider interfaces (e.g. Watchmode).
 */

// ── Identifier Models ────────────────────────────────────────────────────────

export interface NormalizedExternalIds {
  imdbId?: string | null;
  tmdbId?: number | null;
  tvdbId?: number | null;
  tvmazeId?: number | null;
  tvrageId?: number | null;
  wikidataId?: string | null;
}

// ── Ratings & External Scores ────────────────────────────────────────────────

export interface NormalizedRating {
  source: "imdb" | "rottenTomatoes" | "metacritic" | "tmdb" | "tvmaze";
  value: string;
  votes?: string | null;
  maxValue?: string;
}

export interface EnrichedRatingsSummary {
  imdbRating: string | null;
  imdbVotes: string | null;
  rottenTomatoes: string | null;
  metascore: string | null;
  awards: string | null;
  boxOffice: string | null;
}

// ── TV Broadcast & Schedule ──────────────────────────────────────────────────

export interface TVBroadcastSchedule {
  network: string | null;
  networkCountry?: string | null;
  webChannel: string | null;
  days: string[];
  time: string | null; // e.g. "21:00"
  timezone?: string | null;
}

export interface NextOrPrevEpisode {
  id?: number | null;
  name: string;
  season: number;
  number: number;
  airdate: string; // "YYYY-MM-DD"
  airtime?: string | null;
  summary?: string | null;
}

// ── Episode & Season Models ──────────────────────────────────────────────────

export interface NormalizedEpisode {
  id?: number | string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview: string | null;
  airDate: string | null;
  airTime?: string | null;
  runtime?: number | null;
  stillPath?: string | null;
  voteAverage?: number | null;
  isSpecial: boolean;
  tvmazeUrl?: string | null;
}

export interface NormalizedSeason {
  id?: number | string;
  seasonNumber: number;
  name: string;
  overview: string | null;
  episodeCount: number;
  airDate: string | null;
  posterPath: string | null;
  episodes: NormalizedEpisode[];
}

// ── Cast & Crew ──────────────────────────────────────────────────────────────

export interface NormalizedPersonCredit {
  id: number | string;
  name: string;
  role: "cast" | "crew";
  character?: string | null;
  department?: string | null;
  job?: string | null;
  image?: string | null;
}

// ── Top-Level Normalized Media ───────────────────────────────────────────────

export interface NormalizedMediaBase {
  id: number | string;
  title: string;
  originalTitle?: string | null;
  mediaType: "movie" | "tv";
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  genres: string[];
  status?: string | null;
  externalIds: NormalizedExternalIds;
  ratings?: EnrichedRatingsSummary;
}

export interface NormalizedTVSeries extends NormalizedMediaBase {
  mediaType: "tv";
  broadcastSchedule: TVBroadcastSchedule;
  totalSeasons: number;
  totalEpisodes: number;
  nextEpisode?: NextOrPrevEpisode | null;
  previousEpisode?: NextOrPrevEpisode | null;
  seasons?: NormalizedSeason[];
  specials?: NormalizedEpisode[];
  credits?: NormalizedPersonCredit[];
}

export interface NormalizedMovie extends NormalizedMediaBase {
  mediaType: "movie";
  runtime?: number | null;
  budget?: number | null;
  revenue?: number | null;
}

// ── Future Streaming Provider (e.g. Watchmode) ──────────────────────────────

export interface StreamingSource {
  sourceId: string;
  name: string;
  type: "sub" | "rent" | "buy" | "free";
  region: string;
  webUrl: string;
  format?: "SD" | "HD" | "4K";
  price?: number;
  currency?: string;
}

export interface StreamingAvailability {
  mediaId: string | number;
  mediaType: "movie" | "tv";
  region: string;
  sources: StreamingSource[];
  updatedAt: string;
}

/**
 * Contract for a streaming provider.
 * When ready to integrate Watchmode, implement this interface without modifying existing providers.
 */
export interface StreamingProvider {
  readonly name: string;
  getWatchProviders(
    externalIds: NormalizedExternalIds,
    mediaType: "movie" | "tv",
    region?: string,
  ): Promise<StreamingSource[]>;
}

// ── Metadata Provider Architecture ──────────────────────────────────────────

export type ProviderName = "tmdb" | "omdb" | "tvmaze" | "watchmode";

export interface MetadataProvider {
  readonly name: ProviderName;
  readonly supportedMediaTypes: ReadonlyArray<"movie" | "tv">;
}
