import { json } from "./_lib/http.js";
import { getServerEnv } from "./_lib/env.js";
import { createServerLogger } from "./_lib/logger.js";
import {
  enforceRequestSecurity,
  ensureRequestId,
} from "./_lib/requestSecurity.js";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const EXCLUDED_PARAMS = new Set(["endpoint", "maturity_level"]);
const logger = createServerLogger("tmdb-proxy");

function getCacheControlHeader(endpoint) {
  if (endpoint.startsWith("/trending")) {
    return "s-maxage=300, stale-while-revalidate=600";
  }

  if (
    /^\/(?:movie|tv)\/\d+$/.test(endpoint) ||
    /^\/(?:movie|tv)\/\d+\/(?:credits|similar|recommendations|release_dates|content_ratings|watch\/providers|videos)$/.test(
      endpoint,
    )
  ) {
    return "s-maxage=86400, stale-while-revalidate=604800";
  }

  return "s-maxage=300, stale-while-revalidate=600";
}

function parseMaturityRating(rawValue) {
  if (rawValue === "strict" || rawValue === "moderate" || rawValue === "none") {
    return rawValue;
  }
  return "strict";
}

function withDiscoverMovieCertificationConstraints(
  endpoint,
  maturityRating,
  tmdbParams,
) {
  if (endpoint !== "/discover/movie" || maturityRating === "none") return;

  tmdbParams.set("certification_country", "US");
  tmdbParams.set(
    "certification.lte",
    maturityRating === "strict" ? "PG-13" : "R",
  );
}

function normalizeRating(value = "") {
  return value.toUpperCase().replace(/\s+/g, "").replace(/[_-]/g, "");
}

function extractPolicyRatingFromPayload(payload) {
  const releaseDates = payload?.release_dates?.results;
  if (Array.isArray(releaseDates)) {
    const ordered = [
      ...releaseDates.filter((entry) => entry?.iso_3166_1 === "US"),
      ...releaseDates.filter((entry) => entry?.iso_3166_1 !== "US"),
    ];

    for (const entry of ordered) {
      const found = (entry?.release_dates || [])
        .map((item) => item?.certification?.trim())
        .find(Boolean);
      if (found) return found;
    }
  }

  const contentRatings = payload?.content_ratings?.results;
  if (Array.isArray(contentRatings)) {
    const ordered = [
      ...contentRatings.filter((entry) => entry?.iso_3166_1 === "US"),
      ...contentRatings.filter((entry) => entry?.iso_3166_1 !== "US"),
    ];
    return ordered.map((entry) => entry?.rating?.trim()).find(Boolean);
  }

  return undefined;
}

function isBlockedByMaturity(media, maturityRating) {
  if (maturityRating === "none") return false;
  if (media?.adult === true) return true;

  const rating = normalizeRating(media?.certification || media?.rating);
  if (!rating) return false;

  if (maturityRating === "strict") {
    return (
      rating === "R" ||
      rating === "NC17" ||
      rating === "18+" ||
      rating === "ADULT"
    );
  }

  return rating === "NC17" || rating === "18+" || rating === "ADULT";
}

function maybeFilterResults(value, maturityRating) {
  if (!value || typeof value !== "object" || !Array.isArray(value.results)) {
    return value;
  }

  return {
    ...value,
    results: value.results.filter((item) => {
      if (!item || typeof item !== "object") return false;
      return !isBlockedByMaturity(item, maturityRating);
    }),
  };
}

function applyServerSideSafetyFilter(data, maturityRating) {
  if (maturityRating === "none" || !data || typeof data !== "object") {
    return data;
  }

  const payload = { ...data };

  if ("adult" in payload) {
    const policyRating = extractPolicyRatingFromPayload(payload);
    if (
      isBlockedByMaturity(
        { ...payload, rating: payload.rating || policyRating },
        maturityRating,
      )
    ) {
      return {
        id: payload.id,
        error: "This content is blocked by maturity rating policy.",
        blocked_by_policy: true,
      };
    }
  }

  if (Array.isArray(payload.results)) {
    payload.results = maybeFilterResults(payload, maturityRating).results;
  }
  if ("recommendations" in payload) {
    payload.recommendations = maybeFilterResults(
      payload.recommendations,
      maturityRating,
    );
  }
  if ("similar" in payload) {
    payload.similar = maybeFilterResults(payload.similar, maturityRating);
  }

  return payload;
}

export default async function handler(req, res) {
  ensureRequestId(req, res);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }

  const security = await enforceRequestSecurity(req, res, "tmdb-proxy");
  if (!security.ok) {
    return json(res, security.status, { error: security.error });
  }

  const tmdbApiKey = getServerEnv("TMDB_API_KEY");
  if (!tmdbApiKey) {
    logger.error("TMDB server configuration is missing.");
    return json(res, 503, { error: "Content data is temporarily unavailable." });
  }

  const endpoint = String(req.query?.endpoint || "");
  const maturityRating = parseMaturityRating(req.query?.maturity_level ?? null);

  if (!endpoint) {
    return json(res, 400, { error: "Missing endpoint parameter" });
  }

  if (
    !endpoint.startsWith("/") ||
    endpoint.includes("..") ||
    !/^\/[a-zA-Z0-9/_-]+$/.test(endpoint)
  ) {
    return json(res, 400, { error: "Invalid endpoint" });
  }

  const tmdbParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (EXCLUDED_PARAMS.has(key)) continue;
    if (Array.isArray(value)) {
      if (value[0]) tmdbParams.set(key, String(value[0]));
      continue;
    }
    if (value) tmdbParams.set(key, String(value));
  }

  if (!tmdbParams.has("language")) tmdbParams.set("language", "en");
  if (!tmdbParams.has("page")) tmdbParams.set("page", "1");
  if (maturityRating !== "none") {
    tmdbParams.set("include_adult", "false");
  } else if (!tmdbParams.has("include_adult")) {
    tmdbParams.set("include_adult", "false");
  }

  withDiscoverMovieCertificationConstraints(
    endpoint,
    maturityRating,
    tmdbParams,
  );

  const isV4Token = tmdbApiKey.includes(".");
  if (!isV4Token) {
    tmdbParams.set("api_key", tmdbApiKey);
  }

  const tmdbUrl = `${TMDB_BASE_URL}${endpoint}?${tmdbParams.toString()}`;

  try {
    const response = await fetch(tmdbUrl, {
      headers: isV4Token
        ? {
            Authorization: `Bearer ${tmdbApiKey}`,
            "Content-Type": "application/json",
          }
        : { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      logger.warn("TMDB upstream error.", {
        endpoint,
        status: response.status,
      });
      return json(res, response.status === 404 ? 404 : 502, {
        error:
          response.status === 404
            ? "The requested title was not found."
            : "Content data is temporarily unavailable.",
      });
    }

    const data = applyServerSideSafetyFilter(
      await response.json(),
      maturityRating,
    );
    res.setHeader("Cache-Control", getCacheControlHeader(endpoint));
    return json(res, 200, data);
  } catch (error) {
    logger.error("Failed to reach TMDB.", error);
    return json(res, 502, {
      error: "Content data is temporarily unavailable.",
    });
  }
}
