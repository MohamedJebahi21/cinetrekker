/**
 * Deterministic Metadata Normalizer & Precedence Merger
 *
 * Enforces authoritative source precedence:
 * - TMDB: Authoritative for catalog discovery, poster/backdrops, genres, and base metadata.
 * - OMDb: Authoritative for critical external ratings (IMDb, RT, Metacritic, Awards, Box Office).
 * - TVmaze: Authoritative for TV broadcast schedules, networks/platforms, exact airtimes,
 *   next/previous episode pointers, and specials/Season 0 coverage.
 */

import type {
  NormalizedTVSeries,
  NormalizedEpisode,
  NormalizedSeason,
  TVBroadcastSchedule,
  EnrichedRatingsSummary,
  NormalizedExternalIds,
  NextOrPrevEpisode,
} from "./types.ts";

export interface TMDBShowInput {
  id: number;
  name?: string;
  title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string | null;
  genres?: Array<{ id: number; name: string }>;
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: Array<{
    id: number;
    season_number: number;
    name: string;
    overview: string;
    episode_count: number;
    air_date?: string | null;
    poster_path?: string | null;
  }>;
  external_ids?: {
    imdb_id?: string | null;
    tvdb_id?: number | null;
  };
}

/**
 * Merge TV show metadata across TMDB, TVmaze, and OMDb using strict precedence.
 */
export function mergeTVSeriesMetadata(params: {
  tmdb?: TMDBShowInput | null;
  tvmaze?: NormalizedTVSeries | null;
  omdbRatings?: EnrichedRatingsSummary | null;
}): NormalizedTVSeries {
  const { tmdb, tvmaze, omdbRatings } = params;

  // External IDs: Union across providers
  const externalIds: NormalizedExternalIds = {
    tmdbId: tmdb?.id ?? null,
    imdbId: tmdb?.external_ids?.imdb_id || tvmaze?.externalIds?.imdbId || null,
    tvdbId: tmdb?.external_ids?.tvdb_id || tvmaze?.externalIds?.tvdbId || null,
    tvmazeId: tvmaze?.externalIds?.tvmazeId || null,
    tvrageId: tvmaze?.externalIds?.tvrageId || null,
  };

  // Broadcast schedule: TVmaze is authoritative
  const broadcastSchedule: TVBroadcastSchedule = tvmaze?.broadcastSchedule || {
    network: null,
    networkCountry: null,
    webChannel: null,
    days: [],
    time: null,
    timezone: null,
  };

  // Next / Previous episodes: TVmaze authoritative
  const nextEpisode: NextOrPrevEpisode | null = tvmaze?.nextEpisode || null;
  const previousEpisode: NextOrPrevEpisode | null = tvmaze?.previousEpisode || null;

  // Ratings: OMDb authoritative
  const ratings: EnrichedRatingsSummary = omdbRatings || {
    imdbRating: null,
    imdbVotes: null,
    rottenTomatoes: null,
    metascore: null,
    awards: null,
    boxOffice: null,
  };

  // Title: TMDB primary, TVmaze fallback
  const title = tmdb?.name || tmdb?.title || tvmaze?.title || "Unknown Show";

  // Overview: TMDB primary, TVmaze fallback
  const overview = (tmdb?.overview && tmdb.overview.trim().length > 0)
    ? tmdb.overview
    : (tvmaze?.overview || null);

  // Poster & Backdrop: TMDB primary (with TMDB CDN prefix if needed)
  const posterPath = tmdb?.poster_path
    ? (tmdb.poster_path.startsWith("http") ? tmdb.poster_path : `https://image.tmdb.org/t/p/w500${tmdb.poster_path}`)
    : (tvmaze?.posterPath || null);

  const backdropPath = tmdb?.backdrop_path
    ? (tmdb.backdrop_path.startsWith("http") ? tmdb.backdrop_path : `https://image.tmdb.org/t/p/original${tmdb.backdrop_path}`)
    : null;

  const releaseDate = tmdb?.first_air_date || tvmaze?.releaseDate || null;

  const genres: string[] = tmdb?.genres?.map((g) => g.name) || tvmaze?.genres || [];

  const status = tmdb?.status || tvmaze?.status || null;

  const totalSeasons = Math.max(
    tmdb?.number_of_seasons ?? 0,
    tvmaze?.totalSeasons ?? 0,
  );

  const totalEpisodes = Math.max(
    tmdb?.number_of_episodes ?? 0,
    tvmaze?.totalEpisodes ?? 0,
  );

  // Seasons: Build normalized seasons using TMDB as base structure and TVmaze for enrichment
  const seasonsMap = new Map<number, NormalizedSeason>();

  if (tvmaze?.seasons) {
    for (const season of tvmaze.seasons) {
      seasonsMap.set(season.seasonNumber, season);
    }
  }

  if (tmdb?.seasons) {
    for (const tmdbSeason of tmdb.seasons) {
      const existing = seasonsMap.get(tmdbSeason.season_number);
      const normalizedTmdbSeason: NormalizedSeason = {
        id: tmdbSeason.id,
        seasonNumber: tmdbSeason.season_number,
        name: tmdbSeason.name || existing?.name || `Season ${tmdbSeason.season_number}`,
        overview: tmdbSeason.overview || existing?.overview || null,
        episodeCount: Math.max(tmdbSeason.episode_count || 0, existing?.episodeCount || 0),
        airDate: tmdbSeason.air_date || existing?.airDate || null,
        posterPath: tmdbSeason.poster_path
          ? (tmdbSeason.poster_path.startsWith("http") ? tmdbSeason.poster_path : `https://image.tmdb.org/t/p/w500${tmdbSeason.poster_path}`)
          : (existing?.posterPath || null),
        episodes: existing?.episodes || [],
      };
      seasonsMap.set(tmdbSeason.season_number, normalizedTmdbSeason);
    }
  }

  const seasons = Array.from(seasonsMap.values()).sort((a, b) => a.seasonNumber - b.seasonNumber);

  return {
    id: tmdb?.id || tvmaze?.id || "unknown",
    title,
    mediaType: "tv",
    overview,
    posterPath,
    backdropPath,
    releaseDate,
    genres,
    status,
    broadcastSchedule,
    totalSeasons,
    totalEpisodes,
    nextEpisode,
    previousEpisode,
    seasons,
    specials: tvmaze?.specials || [],
    externalIds,
    ratings,
  };
}

/**
 * Merge an array of TMDB episodes with TVmaze episodes for a given season.
 * Adds missing air times, alternative descriptions if TMDB is blank, and TVmaze links.
 */
export function mergeSeasonEpisodes(params: {
  tmdbEpisodes?: Array<{
    id: number;
    name: string;
    overview: string;
    episode_number: number;
    season_number: number;
    air_date: string | null;
    still_path: string | null;
    vote_average?: number;
    runtime?: number | null;
  }>;
  tvmazeEpisodes?: NormalizedEpisode[];
}): NormalizedEpisode[] {
  const { tmdbEpisodes = [], tvmazeEpisodes = [] } = params;

  const tvmazeMap = new Map<number, NormalizedEpisode>();
  for (const ep of tvmazeEpisodes) {
    tvmazeMap.set(ep.episodeNumber, ep);
  }

  const merged: NormalizedEpisode[] = [];

  for (const tmdbEp of tmdbEpisodes) {
    const tvmazeEp = tvmazeMap.get(tmdbEp.episode_number);

    const overview = tmdbEp.overview && tmdbEp.overview.trim().length > 0
      ? tmdbEp.overview
      : (tvmazeEp?.overview || null);

    const airTime = tvmazeEp?.airTime || null;
    const stillPath = tmdbEp.still_path
      ? (tmdbEp.still_path.startsWith("http") ? tmdbEp.still_path : `https://image.tmdb.org/t/p/w500${tmdbEp.still_path}`)
      : (tvmazeEp?.stillPath || null);

    merged.push({
      id: tmdbEp.id,
      seasonNumber: tmdbEp.season_number,
      episodeNumber: tmdbEp.episode_number,
      name: tmdbEp.name || tvmazeEp?.name || `Episode ${tmdbEp.episode_number}`,
      overview,
      airDate: tmdbEp.air_date || tvmazeEp?.airDate || null,
      airTime,
      runtime: tmdbEp.runtime ?? tvmazeEp?.runtime ?? null,
      stillPath,
      voteAverage: tmdbEp.vote_average ?? tvmazeEp?.voteAverage ?? null,
      isSpecial: tmdbEp.season_number === 0,
      tvmazeUrl: tvmazeEp?.tvmazeUrl || null,
    });
  }

  // Include any extra episodes found only in TVmaze (e.g. newly announced or specials)
  for (const tvmazeEp of tvmazeEpisodes) {
    if (!merged.some((m) => m.episodeNumber === tvmazeEp.episodeNumber)) {
      merged.push(tvmazeEp);
    }
  }

  return merged.sort((a, b) => a.episodeNumber - b.episodeNumber);
}
