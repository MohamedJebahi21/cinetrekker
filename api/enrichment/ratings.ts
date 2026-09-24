import { json } from "../_lib/http.js";
import { enforceRequestSecurity } from "../_lib/requestSecurity.js";
import { getServerEnv } from "../_lib/env.js";
import type { ApiServerRequest, ApiServerResponse } from "../_lib/types.ts";
import { imdbIdSchema, type EnrichedRatings } from "../../src/lib/schemas/apiContracts.ts";

const memoryCache = new Map<string, { expiresAt: number; data: EnrichedRatings }>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

  // Set Vercel Edge / CDN caching headers
  res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=86400");

  // Check in-memory cache
  const cached = memoryCache.get(imdbId);
  if (cached && cached.expiresAt > Date.now()) {
    return json(res, 200, cached.data);
  }

  const omdbApiKey = getServerEnv("OMDB_API_KEY");
  if (!omdbApiKey) {
    // Fail-soft: if no key is configured, return graceful empty structure
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
    const timeout = setTimeout(() => controller.abort(), 8000);

    const omdbUrl = `https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(omdbApiKey)}`;
    const response = await fetch(omdbUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return json(res, 200, {
        imdbRating: null,
        imdbVotes: null,
        rottenTomatoes: null,
        metascore: null,
        awards: null,
        boxOffice: null,
      });
    }

    const data = await response.json();
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

    const ratingsArray: Array<{ Source?: string; Value?: string }> = Array.isArray(data.Ratings)
      ? data.Ratings
      : [];

    const rtRating = ratingsArray.find((r) => r.Source === "Rotten Tomatoes")?.Value || null;
    const metaRating = data.Metascore && data.Metascore !== "N/A" ? `${data.Metascore}/100` : null;
    const imdbRating = data.imdbRating && data.imdbRating !== "N/A" ? data.imdbRating : null;
    const imdbVotes = data.imdbVotes && data.imdbVotes !== "N/A" ? data.imdbVotes : null;
    const awards = data.Awards && data.Awards !== "N/A" ? data.Awards : null;
    const boxOffice = data.BoxOffice && data.BoxOffice !== "N/A" ? data.BoxOffice : null;

    const payload: EnrichedRatings = {
      imdbRating,
      imdbVotes,
      rottenTomatoes: rtRating,
      metascore: metaRating,
      awards,
      boxOffice,
    };

    memoryCache.set(imdbId, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      data: payload,
    });

    return json(res, 200, payload);
  } catch (err) {
    console.error("OMDb API fetch error:", err);
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
