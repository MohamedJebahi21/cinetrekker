/**
 * TVmaze Metadata Provider Client
 *
 * Specializes in TV series metadata, broadcast schedules, exact airtimes,
 * network/platform data, and complete episode catalogs (including specials/Season 0).
 *
 * Complies with TVmaze rate limits (max 20 calls per 10s) with local pacing,
 * in-memory caching, exponential backoff, and fail-soft behavior.
 */

import type {
  NormalizedTVSeries,
  NormalizedEpisode,
  NormalizedSeason,
  TVBroadcastSchedule,
  NextOrPrevEpisode,
} from "../types.ts";

const TVMAZE_BASE_URL = "https://api.tvmaze.com";
const DEFAULT_TIMEOUT_MS = 6000;

// ── In-Memory Cache ─────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const showCache = new Map<string, CacheEntry<TVmazeShow>>();
const episodeCache = new Map<string, CacheEntry<NormalizedEpisode[]>>();

const SHOW_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const EPISODE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ── Rate Limiter (Token Bucket: 20 calls / 10s) ─────────────────────────────

class TVmazeRateLimiter {
  private tokens: number = 20;
  private maxTokens: number = 20;
  private lastRefill: number = Date.now();
  private refillIntervalMs: number = 10000; // 10 seconds

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed > this.refillIntervalMs) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens <= 0) {
      const waitTime = Math.max(500, this.refillIntervalMs - (Date.now() - this.lastRefill));
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refill();
    }
    this.tokens = Math.max(0, this.tokens - 1);
  }
}

const rateLimiter = new TVmazeRateLimiter();

// ── Raw TVmaze Schema Interfaces ────────────────────────────────────────────

export interface TVmazeShow {
  id: number;
  url: string;
  name: string;
  type: string;
  language: string;
  genres: string[];
  status: string;
  runtime?: number | null;
  averageRuntime?: number | null;
  premiered?: string | null;
  ended?: string | null;
  officialSite?: string | null;
  schedule?: {
    time: string;
    days: string[];
  };
  rating?: {
    average?: number | null;
  };
  weight?: number;
  network?: {
    id: number;
    name: string;
    country?: { name: string; code: string; timezone: string } | null;
  } | null;
  webChannel?: {
    id: number;
    name: string;
    country?: { name: string; code: string; timezone: string } | null;
  } | null;
  externals?: {
    tvrage?: number | null;
    thetvdb?: number | null;
    imdb?: string | null;
  };
  image?: {
    medium?: string | null;
    original?: string | null;
  } | null;
  summary?: string | null;
  _links?: {
    self?: { href: string };
    previousepisode?: { href: string };
    nextepisode?: { href: string };
  };
  _embedded?: {
    episodes?: TVmazeRawEpisode[];
    seasons?: TVmazeRawSeason[];
    cast?: Array<{ person: { id: number; name: string; image?: { medium?: string } }; character: { id: number; name: string } }>;
    nextepisode?: TVmazeRawEpisode;
    previousepisode?: TVmazeRawEpisode;
  };
}

export interface TVmazeRawEpisode {
  id: number;
  url: string;
  name: string;
  season: number;
  number: number | null;
  type?: string;
  airdate: string;
  airtime?: string | null;
  airstamp?: string | null;
  runtime?: number | null;
  rating?: { average?: number | null };
  image?: { medium?: string | null; original?: string | null } | null;
  summary?: string | null;
}

export interface TVmazeRawSeason {
  id: number;
  url: string;
  number: number;
  name?: string;
  episodeOrder?: number | null;
  premiereDate?: string | null;
  endDate?: string | null;
  network?: { name: string } | null;
  webChannel?: { name: string } | null;
  image?: { medium?: string | null; original?: string | null } | null;
  summary?: string | null;
}

export interface TVmazeSearchResult {
  score: number;
  show: TVmazeShow;
}

// ── HTML Sanitizer Helper ───────────────────────────────────────────────────

function stripHtml(html?: string | null): string | null {
  if (!html) return null;
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ── Core Fetch with Retries & Timeout ───────────────────────────────────────

async function fetchFromTVmaze<T>(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  retries: number = 1,
): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await rateLimiter.acquire();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "CineTrekker/1.0 (https://cinetrekker.vercel.app)",
          Accept: "application/json",
        },
      });

      clearTimeout(timer);

      if (response.status === 404) {
        return null;
      }

      if (response.status === 429) {
        if (attempt < retries) {
          const backoff = 1000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        return null;
      }

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as T;
    } catch {
      if (attempt >= retries) {
        return null;
      }
    }
  }
  return null;
}

// ── Provider Functions ──────────────────────────────────────────────────────

/**
 * Look up a TV show on TVmaze by its IMDb identifier.
 */
export async function getShowByImdbId(imdbId: string): Promise<TVmazeShow | null> {
  const cacheKey = `imdb:${imdbId}`;
  const cached = showCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `${TVMAZE_BASE_URL}/lookup/shows?imdb=${encodeURIComponent(imdbId)}`;
  const show = await fetchFromTVmaze<TVmazeShow>(url);

  if (show) {
    showCache.set(cacheKey, { data: show, expiresAt: Date.now() + SHOW_CACHE_TTL_MS });
    showCache.set(`id:${show.id}`, { data: show, expiresAt: Date.now() + SHOW_CACHE_TTL_MS });
  }

  return show;
}

/**
 * Look up a TV show on TVmaze by its TheTVDB identifier.
 */
export async function getShowByThetvdbId(thetvdbId: number): Promise<TVmazeShow | null> {
  const cacheKey = `thetvdb:${thetvdbId}`;
  const cached = showCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `${TVMAZE_BASE_URL}/lookup/shows?thetvdb=${encodeURIComponent(thetvdbId)}`;
  const show = await fetchFromTVmaze<TVmazeShow>(url);

  if (show) {
    showCache.set(cacheKey, { data: show, expiresAt: Date.now() + SHOW_CACHE_TTL_MS });
    showCache.set(`id:${show.id}`, { data: show, expiresAt: Date.now() + SHOW_CACHE_TTL_MS });
  }

  return show;
}

/**
 * Look up a TV show by its TVmaze ID with embedded relationships (episodes, seasons, cast, next/prev episode).
 */
export async function getShowDetails(
  showId: number,
  embeds: Array<"episodes" | "seasons" | "cast" | "nextepisode" | "previousepisode"> = [
    "episodes",
    "seasons",
    "nextepisode",
    "previousepisode",
  ],
): Promise<TVmazeShow | null> {
  const cacheKey = `id:${showId}:embeds:${embeds.join(",")}`;
  const cached = showCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const embedParams = embeds.map((e) => `embed[]=${encodeURIComponent(e)}`).join("&");
  const url = `${TVMAZE_BASE_URL}/shows/${encodeURIComponent(showId)}?${embedParams}`;
  const show = await fetchFromTVmaze<TVmazeShow>(url);

  if (show) {
    showCache.set(cacheKey, { data: show, expiresAt: Date.now() + SHOW_CACHE_TTL_MS });
  }

  return show;
}

/**
 * Search for TV shows on TVmaze by text query.
 */
export async function searchShows(query: string): Promise<TVmazeSearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const url = `${TVMAZE_BASE_URL}/search/shows?q=${encodeURIComponent(query.trim())}`;
  const results = await fetchFromTVmaze<TVmazeSearchResult[]>(url, 5000);
  return results || [];
}

/**
 * Get all episodes for a show, including specials (Season 0).
 */
export async function getEpisodes(
  showId: number,
  includeSpecials: boolean = true,
): Promise<NormalizedEpisode[]> {
  const cacheKey = `episodes:${showId}:specials:${includeSpecials}`;
  const cached = episodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `${TVMAZE_BASE_URL}/shows/${encodeURIComponent(showId)}/episodes${
    includeSpecials ? "?specials=1" : ""
  }`;

  const rawEpisodes = await fetchFromTVmaze<TVmazeRawEpisode[]>(url);
  if (!rawEpisodes) {
    return [];
  }

  const normalized = rawEpisodes.map((ep): NormalizedEpisode => {
    const isSpecial = ep.season === 0 || ep.type === "significant_special" || !ep.number;
    return {
      id: ep.id,
      seasonNumber: ep.season,
      episodeNumber: ep.number ?? 0,
      name: ep.name,
      overview: stripHtml(ep.summary),
      airDate: ep.airdate || null,
      airTime: ep.airtime || null,
      runtime: ep.runtime || null,
      stillPath: ep.image?.original || ep.image?.medium || null,
      voteAverage: ep.rating?.average || null,
      isSpecial,
      tvmazeUrl: ep.url,
    };
  });

  episodeCache.set(cacheKey, {
    data: normalized,
    expiresAt: Date.now() + EPISODE_CACHE_TTL_MS,
  });

  return normalized;
}

/**
 * Fetch a specific episode by season and episode number.
 */
export async function getEpisodeByNumber(
  showId: number,
  season: number,
  number: number,
): Promise<NormalizedEpisode | null> {
  const url = `${TVMAZE_BASE_URL}/shows/${encodeURIComponent(
    showId,
  )}/episodebynumber?season=${encodeURIComponent(season)}&number=${encodeURIComponent(number)}`;

  const raw = await fetchFromTVmaze<TVmazeRawEpisode>(url);
  if (!raw) return null;

  return {
    id: raw.id,
    seasonNumber: raw.season,
    episodeNumber: raw.number ?? number,
    name: raw.name,
    overview: stripHtml(raw.summary),
    airDate: raw.airdate || null,
    airTime: raw.airtime || null,
    runtime: raw.runtime || null,
    stillPath: raw.image?.original || raw.image?.medium || null,
    voteAverage: raw.rating?.average || null,
    isSpecial: raw.season === 0,
    tvmazeUrl: raw.url,
  };
}

// ── Normalization Helpers ───────────────────────────────────────────────────

export function extractBroadcastSchedule(show: TVmazeShow): TVBroadcastSchedule {
  const schedule = show.schedule || { time: "", days: [] };
  const networkName = show.network?.name || null;
  const webChannelName = show.webChannel?.name || null;
  const networkCountry = show.network?.country?.name || show.webChannel?.country?.name || null;
  const timezone = show.network?.country?.timezone || show.webChannel?.country?.timezone || null;

  return {
    network: networkName,
    networkCountry,
    webChannel: webChannelName,
    days: Array.isArray(schedule.days) ? schedule.days : [],
    time: schedule.time && schedule.time.trim() !== "" ? schedule.time : null,
    timezone,
  };
}

export function extractNextOrPrevEpisode(
  raw?: TVmazeRawEpisode | null,
): NextOrPrevEpisode | null {
  if (!raw || !raw.name || !raw.airdate) return null;

  return {
    id: raw.id,
    name: raw.name,
    season: raw.season,
    number: raw.number ?? 0,
    airdate: raw.airdate,
    airtime: raw.airtime || null,
    summary: stripHtml(raw.summary),
  };
}

/**
 * Convert a TVmaze show object to a NormalizedTVSeries.
 */
export function normalizeTVmazeShow(show: TVmazeShow): NormalizedTVSeries {
  const broadcastSchedule = extractBroadcastSchedule(show);
  const nextEpisode = extractNextOrPrevEpisode(
    show._embedded?.nextepisode || undefined,
  );
  const previousEpisode = extractNextOrPrevEpisode(
    show._embedded?.previousepisode || undefined,
  );

  const rawEpisodes = show._embedded?.episodes || [];
  const episodesBySeason = new Map<number, NormalizedEpisode[]>();
  const specials: NormalizedEpisode[] = [];

  for (const raw of rawEpisodes) {
    const isSpecial = raw.season === 0 || raw.type === "significant_special" || !raw.number;
    const ep: NormalizedEpisode = {
      id: raw.id,
      seasonNumber: raw.season,
      episodeNumber: raw.number ?? 0,
      name: raw.name,
      overview: stripHtml(raw.summary),
      airDate: raw.airdate || null,
      airTime: raw.airtime || null,
      runtime: raw.runtime || null,
      stillPath: raw.image?.original || raw.image?.medium || null,
      voteAverage: raw.rating?.average || null,
      isSpecial,
      tvmazeUrl: raw.url,
    };

    if (isSpecial) {
      specials.push(ep);
    } else {
      if (!episodesBySeason.has(raw.season)) {
        episodesBySeason.set(raw.season, []);
      }
      episodesBySeason.get(raw.season)!.push(ep);
    }
  }

  const rawSeasons = show._embedded?.seasons || [];
  const seasons: NormalizedSeason[] = rawSeasons.map((s) => ({
    id: s.id,
    seasonNumber: s.number,
    name: s.name || `Season ${s.number}`,
    overview: stripHtml(s.summary),
    episodeCount: s.episodeOrder ?? episodesBySeason.get(s.number)?.length ?? 0,
    airDate: s.premiereDate || null,
    posterPath: s.image?.original || s.image?.medium || null,
    episodes: episodesBySeason.get(s.number) || [],
  }));

  return {
    id: show.id,
    title: show.name,
    mediaType: "tv",
    overview: stripHtml(show.summary),
    posterPath: show.image?.original || show.image?.medium || null,
    backdropPath: null,
    releaseDate: show.premiered || null,
    genres: Array.isArray(show.genres) ? show.genres : [],
    status: show.status,
    broadcastSchedule,
    totalSeasons: seasons.length,
    totalEpisodes: rawEpisodes.length,
    nextEpisode,
    previousEpisode,
    seasons,
    specials,
    externalIds: {
      tvmazeId: show.id,
      imdbId: show.externals?.imdb || null,
      tvdbId: show.externals?.thetvdb || null,
      tvrageId: show.externals?.tvrage || null,
    },
  };
}
