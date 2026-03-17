const TMDB_API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 12000;

const HOME_FALLBACK = {
  movies: [],
  trending: [],
  details: null,
};

const DETAIL_FALLBACK = {
  movies: [],
  trending: [],
  details: null,
};

const SEARCH_FALLBACK = {
  query: "",
  results: [],
  totalResults: 0,
  totalPages: 0,
  details: null,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildUrl(path, query = {}) {
  const url = new URL(`${TMDB_API_BASE}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function getTmdbKey() {
  return process.env.TMDB_API_KEY || "";
}

export function getPosterUrl(posterPath) {
  return posterPath ? `${IMAGE_BASE}${posterPath}` : "";
}

async function requestTmdbWithRetry(path, query = {}, label = "unknown") {
  const apiKey = getTmdbKey();
  if (!apiKey) {
    console.error(`[SSR][TMDB][${label}] Missing TMDB_API_KEY`);
    return {
      ok: false,
      status: 500,
      data: null,
      error: "TMDB_API_KEY is not configured",
      attempts: 0,
      fallback: true,
    };
  }

  let lastError = "Unknown TMDB error";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const url = buildUrl(path, { ...query, api_key: apiKey });
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        lastError = `HTTP ${response.status}: ${body.slice(0, 300)}`;
        console.error(`[SSR][TMDB][${label}] Attempt ${attempt}/${MAX_RETRIES} failed - ${lastError}`);
        if (attempt < MAX_RETRIES) {
          await sleep(200 * attempt);
          continue;
        }
        return {
          ok: false,
          status: response.status,
          data: null,
          error: `TMDB request failed with status ${response.status}`,
          attempts: attempt,
          fallback: true,
        };
      }

      const data = await response.json();
      return {
        ok: true,
        status: 200,
        data,
        error: null,
        attempts: attempt,
        fallback: false,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`[SSR][TMDB][${label}] Attempt ${attempt}/${MAX_RETRIES} failed - ${lastError}`);
      if (attempt < MAX_RETRIES) {
        await sleep(200 * attempt);
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ok: false,
    status: 500,
    data: null,
    error: lastError,
    attempts: MAX_RETRIES,
    fallback: true,
  };
}

export async function fetchTmdb(path, query = {}, label = "unknown") {
  return requestTmdbWithRetry(path, query, label);
}

export function toMediaList(payload) {
  if (!payload || !Array.isArray(payload.results)) {
    return [];
  }
  return payload.results;
}

function responseEnvelope(kind, data, errors = [], usedFallback = false, extra = {}) {
  return {
    ok: errors.length === 0,
    kind,
    error: errors.length > 0 ? errors.join(" | ") : null,
    fallback: usedFallback,
    data,
    ...extra,
  };
}

export async function getHomePageData(options = {}) {
  const { page = 1, language = "en-US", includeAdult = false } = options;

  const [moviesRes, trendingRes] = await Promise.all([
    requestTmdbWithRetry(
      "/movie/popular",
      { page, language, include_adult: includeAdult },
      "home-movies",
    ),
    requestTmdbWithRetry(
      "/trending/all/week",
      { page, language, include_adult: includeAdult },
      "home-trending",
    ),
  ]);

  const errors = [moviesRes.error, trendingRes.error].filter(Boolean);
  const usedFallback = moviesRes.fallback || trendingRes.fallback;

  const data = {
    movies: toMediaList(moviesRes.data),
    trending: toMediaList(trendingRes.data),
    details: null,
  };

  if (usedFallback && data.movies.length === 0 && data.trending.length === 0) {
    return responseEnvelope("home", HOME_FALLBACK, errors, true, {
      meta: { page, language, includeAdult },
    });
  }

  return responseEnvelope("home", data, errors, usedFallback, {
    meta: { page, language, includeAdult },
  });
}

export async function getDetailPageData(options = {}) {
  const { id, mediaType = "movie", language = "en-US", includeAdult = false } = options;
  const parsedId = Number(id);

  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    const error = `Invalid detail id: ${id}`;
    console.error(`[SSR][TMDB][detail] ${error}`);
    return responseEnvelope("detail", DETAIL_FALLBACK, [error], true, {
      meta: { id, mediaType, language, includeAdult },
    });
  }

  const primaryType = mediaType === "tv" ? "tv" : "movie";
  const [detailsRes, moviesRes, trendingRes] = await Promise.all([
    requestTmdbWithRetry(`/${primaryType}/${parsedId}`, { language }, `detail-${primaryType}-${parsedId}`),
    requestTmdbWithRetry(
      `/${primaryType}/popular`,
      { page: 1, language, include_adult: includeAdult },
      `detail-${primaryType}-popular-${parsedId}`,
    ),
    requestTmdbWithRetry(
      `/trending/${primaryType}/week`,
      { page: 1, language, include_adult: includeAdult },
      `detail-${primaryType}-trending-${parsedId}`,
    ),
  ]);

  const errors = [detailsRes.error, moviesRes.error, trendingRes.error].filter(Boolean);
  const usedFallback = detailsRes.fallback || moviesRes.fallback || trendingRes.fallback;

  const data = {
    movies: toMediaList(moviesRes.data),
    trending: toMediaList(trendingRes.data),
    details: detailsRes.data || null,
  };

  if (!data.details && data.movies.length === 0 && data.trending.length === 0) {
    return responseEnvelope("detail", DETAIL_FALLBACK, errors, true, {
      meta: { id: parsedId, mediaType: primaryType, language, includeAdult },
    });
  }

  return responseEnvelope("detail", data, errors, usedFallback, {
    meta: { id: parsedId, mediaType: primaryType, language, includeAdult },
  });
}

export async function getSearchPageData(options = {}) {
  const { query = "", page = 1, language = "en-US", includeAdult = false } = options;
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return responseEnvelope(
      "search",
      {
        ...SEARCH_FALLBACK,
        query: normalizedQuery,
      },
      [],
      true,
      { meta: { page, language, includeAdult } },
    );
  }

  const searchRes = await requestTmdbWithRetry(
    "/search/multi",
    {
      query: normalizedQuery,
      page,
      language,
      include_adult: includeAdult,
    },
    "search-multi",
  );

  const payload = searchRes.data || {};
  const results = Array.isArray(payload.results) ? payload.results : [];
  const data = {
    query: normalizedQuery,
    results,
    totalResults: Number(payload.total_results) || 0,
    totalPages: Number(payload.total_pages) || 0,
    details: null,
  };

  const errors = [searchRes.error].filter(Boolean);
  const usedFallback = searchRes.fallback;

  if (usedFallback && results.length === 0) {
    return responseEnvelope(
      "search",
      {
        ...SEARCH_FALLBACK,
        query: normalizedQuery,
      },
      errors,
      true,
      { meta: { page, language, includeAdult } },
    );
  }

  return responseEnvelope("search", data, errors, usedFallback, {
    meta: { page, language, includeAdult },
  });
}