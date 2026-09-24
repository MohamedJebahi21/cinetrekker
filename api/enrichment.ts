import { json } from "./_lib/http.js";
import { enforceRequestSecurity } from "./_lib/requestSecurity.js";
import { getServerEnv } from "./_lib/env.js";
import type { ApiServerRequest, ApiServerResponse } from "./_lib/types.ts";
import {
  imdbIdSchema,
  type EnrichedRatings,
  type TVSchedule,
} from "../src/lib/schemas/apiContracts.ts";

const ratingsCache = new Map<string, { expiresAt: number; data: EnrichedRatings }>();
const RATINGS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const tvScheduleCache = new Map<string, { expiresAt: number; data: TVSchedule }>();
const TV_SCHEDULE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function handleRatings(
  imdbId: string,
  res: ApiServerResponse,
): Promise<ApiServerResponse> {
  res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=86400");

  const cached = ratingsCache.get(imdbId);
  if (cached && cached.expiresAt > Date.now()) {
    return json(res, 200, cached.data);
  }

  const omdbApiKey = getServerEnv("OMDB_API_KEY");
  if (!omdbApiKey) {
    const fallback: EnrichedRatings = {
      imdbRating: null,
      imdbVotes: null,
      rottenTomatoes: null,
      metascore: null,
      awards: null,
      boxOffice: null,
    };
    return json(res, 200, fallback);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const omdbUrl = `https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(omdbApiKey)}`;
    const omdbRes = await fetch(omdbUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "CineTrekker/1.0" },
    });
    clearTimeout(timeout);

    if (!omdbRes.ok) {
      return json(res, 200, {
        imdbRating: null,
        imdbVotes: null,
        rottenTomatoes: null,
        metascore: null,
        awards: null,
        boxOffice: null,
      });
    }

    const data = await omdbRes.json() as Record<string, unknown>;
    if (data.Response === "False") {
      return json(res, 200, {
        imdbRating: null,
        imdbVotes: null,
        rottenTomatoes: null,
        metascore: null,
        awards: null,
        boxOffice: null,
      });
    }

    let rottenTomatoes: string | null = null;
    if (Array.isArray(data.Ratings)) {
      const rtEntry = data.Ratings.find(
        (r: unknown) =>
          typeof r === "object" &&
          r !== null &&
          (r as Record<string, unknown>).Source === "Rotten Tomatoes",
      ) as Record<string, unknown> | undefined;
      if (rtEntry && typeof rtEntry.Value === "string") {
        rottenTomatoes = rtEntry.Value;
      }
    }

    const ratingsResult: EnrichedRatings = {
      imdbRating: typeof data.imdbRating === "string" && data.imdbRating !== "N/A" ? data.imdbRating : null,
      imdbVotes: typeof data.imdbVotes === "string" && data.imdbVotes !== "N/A" ? data.imdbVotes : null,
      rottenTomatoes,
      metascore: typeof data.Metascore === "string" && data.Metascore !== "N/A" ? data.Metascore : null,
      awards: typeof data.Awards === "string" && data.Awards !== "N/A" ? data.Awards : null,
      boxOffice: typeof data.BoxOffice === "string" && data.BoxOffice !== "N/A" ? data.BoxOffice : null,
    };

    ratingsCache.set(imdbId, {
      expiresAt: Date.now() + RATINGS_CACHE_TTL_MS,
      data: ratingsResult,
    });

    return json(res, 200, ratingsResult);
  } catch {
    return json(res, 200, {
      imdbRating: null,
      imdbVotes: null,
      rottenTomatoes: null,
      metascore: null,
      awards: null,
      boxOffice: null,
    });
  }
}

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const tvmazeUrl = `https://api.tvmaze.com/lookup/shows?imdb=${encodeURIComponent(imdbId)}`;
    const tvmazeRes = await fetch(tvmazeUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "CineTrekker/1.0" },
    });
    clearTimeout(timeout);

    if (!tvmazeRes.ok) {
      return json(res, 200, fallback);
    }

    const show = await tvmazeRes.json() as Record<string, unknown>;
    const schedule = typeof show.schedule === "object" && show.schedule !== null
      ? (show.schedule as Record<string, unknown>)
      : {};
    const days = Array.isArray(schedule.days)
      ? (schedule.days.filter((d): d is string => typeof d === "string"))
      : [];
    const time = typeof schedule.time === "string" && schedule.time ? schedule.time : null;

    let network: string | null = null;
    if (typeof show.network === "object" && show.network !== null) {
      const net = show.network as Record<string, unknown>;
      if (typeof net.name === "string") network = net.name;
    } else if (typeof show.webChannel === "object" && show.webChannel !== null) {
      const web = show.webChannel as Record<string, unknown>;
      if (typeof web.name === "string") network = web.name;
    }

    let nextEpisode: TVSchedule["nextEpisode"] = null;
    const links = typeof show._links === "object" && show._links !== null
      ? (show._links as Record<string, unknown>)
      : {};

    if (
      typeof links.nextepisode === "object" &&
      links.nextepisode !== null &&
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

    const result: TVSchedule = {
      network,
      days,
      time,
      nextEpisode,
    };

    tvScheduleCache.set(imdbId, {
      expiresAt: Date.now() + TV_SCHEDULE_CACHE_TTL_MS,
      data: result,
    });

    return json(res, 200, result);
  } catch {
    return json(res, 200, fallback);
  }
}

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
  const action = req.query?.action || req.query?.type;

  if (action === "tv-schedule" || action === "schedule") {
    return handleTvSchedule(imdbId, res);
  }

  return handleRatings(imdbId, res);
}
