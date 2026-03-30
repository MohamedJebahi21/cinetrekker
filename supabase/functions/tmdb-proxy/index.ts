import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Environment-based CORS configuration
// Only allow localhost if NOT in production AND NOT deployed
const isDev =
  Deno.env.get("ENVIRONMENT") !== "production" &&
  Deno.env.get("DENO_DEPLOYMENT_ID") === undefined;

const ALLOWED_ORIGINS = [
  "https://cinetrekker.vercel.app",
  "https://www.cinetrekker.vercel.app",
  ...(isDev
    ? [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8080",
        "http://localhost:4173",
      ]
    : []),
];

const VERCEL_PREVIEW_PATTERN =
  /^https:\/\/cinetrekker-[a-z0-9-]+\.vercel\.app$/;
const LOCAL_ORIGIN_PATTERN =
  /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i;

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const isLocal = isDev && LOCAL_ORIGIN_PATTERN.test(origin);

  // LOGIC FIX: We check if the origin is allowed. If not, we EXPLICITLY
  // return the production URL instead of letting it fall back to a local one.
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    VERCEL_PREVIEW_PATTERN.test(origin) ||
    isLocal;
  const allowedOrigin = isAllowed ? origin : "https://cinetrekker.vercel.app";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-requested-with",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const EXCLUDED_PARAMS = new Set(["endpoint", "maturity_level"]);
type MaturityRating = "strict" | "moderate" | "none";

function getCacheControlHeader(endpoint: string): string {
  if (endpoint.startsWith("/trending")) {
    return "public, max-age=300, s-maxage=300, stale-while-revalidate=600";
  }

  if (
    /^\/(?:movie|tv)\/\d+$/.test(endpoint) ||
    /^\/(?:movie|tv)\/\d+\/(?:credits|similar|recommendations|release_dates|content_ratings|watch\/providers|videos)$/.test(
      endpoint,
    )
  ) {
    return "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";
  }

  return "public, max-age=300, s-maxage=300, stale-while-revalidate=600";
}

function parseMaturityRating(rawValue: string | null): MaturityRating {
  if (rawValue === "strict" || rawValue === "moderate" || rawValue === "none") {
    return rawValue;
  }
  return "strict";
}

function withDiscoverMovieCertificationConstraints(
  endpoint: string,
  maturityRating: MaturityRating,
  tmdbParams: URLSearchParams,
): void {
  if (endpoint !== "/discover/movie") return;
  if (maturityRating === "none") return;

  tmdbParams.set("certification_country", "US");
  tmdbParams.set(
    "certification.lte",
    maturityRating === "strict" ? "PG-13" : "R",
  );
}

function normalizeRating(value?: string): string {
  if (!value) return "";
  return value.toUpperCase().replace(/\s+/g, "").replace(/[_-]/g, "");
}

function extractPolicyRatingFromPayload(
  payload: Record<string, unknown>,
): string | undefined {
  const releaseDates = (
    payload as {
      release_dates?: {
        results?: Array<{
          iso_3166_1?: string;
          release_dates?: Array<{ certification?: string }>;
        }>;
      };
    }
  ).release_dates?.results;

  if (Array.isArray(releaseDates)) {
    const ordered = [
      ...releaseDates.filter((entry) => entry?.iso_3166_1 === "US"),
      ...releaseDates.filter((entry) => entry?.iso_3166_1 !== "US"),
    ];

    for (const entry of ordered) {
      const certs = entry?.release_dates || [];
      const found = certs
        .map((item) => item?.certification?.trim())
        .find((value) => Boolean(value));
      if (found) return found;
    }
  }

  const contentRatings = (
    payload as {
      content_ratings?: {
        results?: Array<{ iso_3166_1?: string; rating?: string }>;
      };
    }
  ).content_ratings?.results;

  if (Array.isArray(contentRatings)) {
    const ordered = [
      ...contentRatings.filter((entry) => entry?.iso_3166_1 === "US"),
      ...contentRatings.filter((entry) => entry?.iso_3166_1 !== "US"),
    ];

    const found = ordered
      .map((entry) => entry?.rating?.trim())
      .find((value) => Boolean(value));
    if (found) return found;
  }

  return undefined;
}

function isBlockedByMaturity(
  media: { adult?: boolean; certification?: string; rating?: string },
  maturityRating: MaturityRating,
): boolean {
  if (maturityRating === "none") return false;
  if (media.adult === true) return true;

  const rating = normalizeRating(media.certification || media.rating);
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

function applyServerSideSafetyFilter(
  data: unknown,
  maturityRating: MaturityRating,
): unknown {
  if (maturityRating === "none") return data;
  if (!data || typeof data !== "object") return data;

  const payload = data as Record<string, unknown>;
  const nextPayload: Record<string, unknown> = { ...payload };

  if ("adult" in payload) {
    const topLevelMedia = payload as {
      adult?: boolean;
      certification?: string;
      rating?: string;
    };
    const policyRating = extractPolicyRatingFromPayload(payload);
    if (
      isBlockedByMaturity(
        {
          ...topLevelMedia,
          rating: topLevelMedia.rating || policyRating,
        },
        maturityRating,
      )
    ) {
      return { ...nextPayload, blocked_by_policy: true };
    }
  }

  const maybeFilterResults = (value: unknown): unknown => {
    if (!value || typeof value !== "object") return value;
    const collection = value as { results?: unknown[] };
    if (!Array.isArray(collection.results)) return value;

    return {
      ...(value as Record<string, unknown>),
      results: collection.results.filter((item) => {
        if (!item || typeof item !== "object") return false;
        return !isBlockedByMaturity(
          item as { adult?: boolean; certification?: string; rating?: string },
          maturityRating,
        );
      }),
    };
  };

  if (Array.isArray((payload as { results?: unknown[] }).results)) {
    nextPayload.results = (
      maybeFilterResults(payload) as { results: unknown[] }
    ).results;
  }

  if ("recommendations" in payload) {
    nextPayload.recommendations = maybeFilterResults(payload.recommendations);
  }
  if ("similar" in payload) {
    nextPayload.similar = maybeFilterResults(payload.similar);
  }

  return nextPayload;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const origin = req.headers.get("origin") || "";
  const isLocal = isDev && LOCAL_ORIGIN_PATTERN.test(origin);

  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    VERCEL_PREVIEW_PATTERN.test(origin) ||
    isLocal;

  if (origin && !isAllowed) {
    return new Response("Forbidden", { status: 403 });
  }

  // 1. Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const TMDB_API_ID = Deno.env.get("TMDB_API_KEY");
    if (!TMDB_API_ID) {
      console.error("[TMDB Proxy] TMDB_API_KEY not found");
      throw new Error("TMDB_API_KEY is not configured");
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    const maturityRating = parseMaturityRating(
      url.searchParams.get("maturity_level"),
    );
    if (!endpoint) {
      throw new Error("Missing endpoint parameter");
    }

    // Validate endpoint: must be a path-only string (no query params - those are
    // handled separately via tmdbParams). Must start with '/', must not contain
    // '..' (path traversal), and must only contain characters valid in TMDB API paths.
    if (
      !endpoint.startsWith("/") ||
      endpoint.includes("..") ||
      !/^\/[a-zA-Z0-9/_-]+$/.test(endpoint)
    ) {
      return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Build TMDB URL
    const tmdbParams = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (!EXCLUDED_PARAMS.has(key) && value) {
        tmdbParams.set(key, value);
      }
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

    const isV4Token = TMDB_API_ID.includes(".");
    if (!isV4Token) {
      tmdbParams.set("api_key", TMDB_API_ID);
    }

    const tmdbUrl = `${TMDB_BASE_URL}${endpoint}?${tmdbParams.toString()}`;

    // 3. Fetch from TMDB
    const response = await fetch(tmdbUrl, {
      headers: isV4Token
        ? {
            Authorization: `Bearer ${TMDB_API_ID}`,
            "Content-Type": "application/json",
          }
        : { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`TMDB API error: ${response.status} - ${errorText}`);
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = applyServerSideSafetyFilter(
      await response.json(),
      maturityRating,
    );

    // 4. Return Response
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": getCacheControlHeader(endpoint),
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in tmdb-proxy:", errorMessage);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
