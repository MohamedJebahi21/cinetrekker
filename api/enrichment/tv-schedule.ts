import { json } from "../_lib/http.js";
import { enforceRequestSecurity } from "../_lib/requestSecurity.js";
import type { ApiServerRequest, ApiServerResponse } from "../_lib/types.ts";
import { imdbIdSchema, type TVSchedule } from "../../src/lib/schemas/apiContracts.ts";

const memoryCache = new Map<string, { expiresAt: number; data: TVSchedule }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

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
      error: "Invalid or missing imdb_id parameter. Format should be e.g. tt0944947",
    });
  }

  const imdbId = parseResult.data;

  // Set Vercel Edge / CDN caching headers
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=3600");

  // Check cache
  const cached = memoryCache.get(imdbId);
  if (cached && cached.expiresAt > Date.now()) {
    return json(res, 200, cached.data);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const tvmazeUrl = `https://api.tvmaze.com/lookup/shows?imdb=${encodeURIComponent(imdbId)}&embed=nextepisode`;
    const response = await fetch(tvmazeUrl, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const emptySchedule: TVSchedule = {
        network: null,
        days: [],
        time: null,
        nextEpisode: null,
      };
      return json(res, 200, emptySchedule);
    }

    const data = await response.json();
    const networkName = data.network?.name || data.webChannel?.name || null;
    const scheduleDays = Array.isArray(data.schedule?.days) ? data.schedule.days : [];
    const scheduleTime = data.schedule?.time || null;

    let nextEpisode = null;
    const nextEp = data._embedded?.nextepisode;
    if (nextEp && typeof nextEp === "object") {
      nextEpisode = {
        name: nextEp.name || "TBA",
        airdate: nextEp.airdate || "",
        airtime: nextEp.airtime || null,
        season: Number(nextEp.season) || 1,
        number: Number(nextEp.number) || 1,
      };
    }

    const payload: TVSchedule = {
      network: networkName,
      days: scheduleDays,
      time: scheduleTime,
      nextEpisode,
    };

    memoryCache.set(imdbId, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      data: payload,
    });

    return json(res, 200, payload);
  } catch (err) {
    console.error("TVMaze lookup error:", err);
    return json(res, 200, {
      network: null,
      days: [],
      time: null,
      nextEpisode: null,
    });
  }
}
