import { json } from "./_lib/http.js";
import { enforceRequestSecurity } from "./_lib/requestSecurity.js";
import { getServerEnv } from "./_lib/env.js";
import type { ApiServerRequest, ApiServerResponse } from "./_lib/types.ts";
import {
  imdbIdSchema,
  type EnrichedRatings,
  type TVSchedule,
} from "../src/lib/schemas/apiContracts.ts";

// ── Provider Layer Imports ────────────────────────────────────────────────────
// These live in api/_lib/metadata/ and do NOT count toward Vercel's 12-function cap.
import {
  getShowByImdbId,
  getShowDetails,
  getEpisodes,
  normalizeTVmazeShow,
  type TVmazeShow,
} from "./_lib/metadata/providers/tvmaze.ts";
import { getRatingsByImdbId } from "./_lib/metadata/providers/omdb.ts";

// ── In-Memory Caches ─────────────────────────────────────────────────────────

const ratingsCache = new Map<string, { expiresAt: number; data: EnrichedRatings }>();
const RATINGS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const tvScheduleCache = new Map<string, { expiresAt: number; data: TVSchedule }>();
const TV_SCHEDULE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const tvDetailsCache = new Map<string, { expiresAt: number; data: unknown }>();
const TV_DETAILS_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const tvEpisodesCache = new Map<string, { expiresAt: number; data: unknown[] }>();
const TV_EPISODES_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ── Handler: Ratings (OMDb → authoritative for IMDb/RT/Metacritic) ───────────

async function handleRatings(
  imdbId: string,
  res: ApiServerResponse,
): Promise<ApiServerResponse> {
  res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=86400");

  const cached = ratingsCache.get(imdbId);
  if (cached && cached.expiresAt > Date.now()) {
    return json(res, 200, cached.data);
  }

  const result = await getRatingsByImdbId(imdbId);

  ratingsCache.set(imdbId, {
    expiresAt: Date.now() + RATINGS_CACHE_TTL_MS,
    data: result,
  });

  return json(res, 200, result);
}

// ── Handler: TV Schedule (TVmaze → broadcast schedule + next episode) ─────────

async function handleTvSchedule(
  imdbId: string,
  res: ApiServerResponse,
): Promise<ApiServerResponse> {
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=3600");

  const cached = tvScheduleCache.get(imdbId);
  if (cached && cached.expiresAt > Date.now()) {
    return json(res, 200, cached.data);
  }

  const fallback: TVSchedule = {
    network: null,
    days: [],
    time: null,
    nextEpisode: null,
  };

  try {
    const show = await getShowByImdbId(imdbId);
    if (!show) {
      return json(res, 200, fallback);
    }

    const schedule = show.schedule || { time: "", days: [] };
    const days = Array.isArray(schedule.days)
      ? schedule.days.filter((d): d is string => typeof d === "string")
      : [];
    const time = typeof schedule.time === "string" && schedule.time.trim() !== "" ? schedule.time : null;

    let network: string | null = null;
    if (show.network?.name) {
      network = show.network.name;
    } else if (show.webChannel?.name) {
      network = show.webChannel.name;
    }

    let nextEpisode: TVSchedule["nextEpisode"] = null;
    const links = show._links || {};

    if (
      links.nextepisode &&
      typeof links.nextepisode === "object" &&
      typeof (links.nextepisode as Record<string, unknown>).href === "string"
    ) {
      try {
        const epController = new AbortController();
        const epTimeout = setTimeout(() => epController.abort(), 4000);
        const epRes = await fetch((links.nextepisode as Record<string, unknown>).href as string, {
          signal: epController.signal,
          headers: { "User-Agent": "CineTrekker/1.0" },
        });
        clearTimeout(epTimeout);

        if (epRes.ok) {
          const epData = await epRes.json() as Record<string, unknown>;
          if (
            typeof epData.name === "string" &&
            typeof epData.airdate === "string" &&
            typeof epData.season === "number" &&
            typeof epData.number === "number"
          ) {
            nextEpisode = {
              name: epData.name,
              airdate: epData.airdate,
              airtime: typeof epData.airtime === "string" ? epData.airtime : null,
              season: epData.season,
              number: epData.number,
            };
          }
        }
      } catch {
        // next episode lookup failure is soft
      }
    }

    const result: TVSchedule = { network, days, time, nextEpisode };

    tvScheduleCache.set(imdbId, {
      expiresAt: Date.now() + TV_SCHEDULE_CACHE_TTL_MS,
      data: result,
    });

    return json(res, 200, result);
  } catch {
    return json(res, 200, fallback);
  }
}

// ── Handler: TV Details (full normalized show via TVmaze) ─────────────────────

async function handleTvDetails(
  imdbId: string,
  res: ApiServerResponse,
): Promise<ApiServerResponse> {
  res.setHeader("Cache-Control", "public, s-maxage=43200, stale-while-revalidate=3600");

  const cached = tvDetailsCache.get(imdbId);
  if (cached && cached.expiresAt > Date.now()) {
    return json(res, 200, cached.data);
  }

  const fallback = { found: false, imdbId };

  try {
    const show: TVmazeShow | null = await getShowByImdbId(imdbId);
    if (!show) {
      return json(res, 200, fallback);
    }

    // Fetch with embedded seasons, next/prev episode — episodes fetched separately to limit payload
    const detailed = await getShowDetails(show.id, ["seasons", "nextepisode", "previousepisode"]);
    const target = detailed || show;
    const normalized = normalizeTVmazeShow(target);

    const result = {
      found: true,
      tvmazeId: normalized.externalIds.tvmazeId,
      imdbId: normalized.externalIds.imdbId,
      tvdbId: normalized.externalIds.tvdbId,
      broadcastSchedule: normalized.broadcastSchedule,
      nextEpisode: normalized.nextEpisode,
      previousEpisode: normalized.previousEpisode,
      totalSeasons: normalized.totalSeasons,
      totalEpisodes: normalized.totalEpisodes,
      status: normalized.status,
      seasons: normalized.seasons?.map((s) => ({
        seasonNumber: s.seasonNumber,
        name: s.name,
        overview: s.overview,
        episodeCount: s.episodeCount,
        airDate: s.airDate,
        posterPath: s.posterPath,
      })),
    };

    tvDetailsCache.set(imdbId, {
      expiresAt: Date.now() + TV_DETAILS_CACHE_TTL_MS,
      data: result,
    });

    return json(res, 200, result);
  } catch {
    return json(res, 200, fallback);
  }
}

// ── Handler: TV Episodes (all episodes for a show, including specials) ─────────

async function handleTvEpisodes(
  imdbId: string,
  res: ApiServerResponse,
): Promise<ApiServerResponse> {
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=3600");

  const cached = tvEpisodesCache.get(imdbId);
  if (cached && cached.expiresAt > Date.now()) {
    return json(res, 200, { found: true, episodes: cached.data });
  }

  try {
    const show = await getShowByImdbId(imdbId);
    if (!show) {
      return json(res, 200, { found: false, episodes: [] });
    }

    const episodes = await getEpisodes(show.id, /* includeSpecials */ true);

    tvEpisodesCache.set(imdbId, {
      expiresAt: Date.now() + TV_EPISODES_CACHE_TTL_MS,
      data: episodes,
    });

    return json(res, 200, { found: true, tvmazeShowId: show.id, episodes });
  } catch {
    return json(res, 200, { found: false, episodes: [] });
  }
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export default async function handler(
  req: ApiServerRequest,
  res: ApiServerResponse,
): Promise<ApiServerResponse> {
  const security = await enforceRequestSecurity(req, res, {
    allowedMethods: ["GET"],
    rateLimitPrefix: "enrichment",
  });

  if (!security.ok) {
    return json(res, security.status, { error: security.error });
  }

  const rawImdbId = Array.isArray(req.query?.imdb_id)
    ? req.query?.imdb_id[0]
    : req.query?.imdb_id;

  const parseResult = imdbIdSchema.safeParse(rawImdbId);
  if (!parseResult.success) {
    return json(res, 400, {
      error: "Invalid or missing imdb_id parameter. Format should be e.g. tt0137523",
    });
  }

  const imdbId = parseResult.data;
  const action = Array.isArray(req.query?.action)
    ? req.query?.action[0]
    : (req.query?.action || req.query?.type);

  if (action === "tv-schedule" || action === "schedule") {
    return handleTvSchedule(imdbId, res);
  }

  if (action === "tv-details") {
    return handleTvDetails(imdbId, res);
  }

  if (action === "tv-episodes") {
    return handleTvEpisodes(imdbId, res);
  }

  // Default: ratings (backward-compatible)
  return handleRatings(imdbId, res);
}
