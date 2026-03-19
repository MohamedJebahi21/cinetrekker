import { getRequiredServerEnv } from "./env.js";

const fetch = globalThis.fetch;

const TMDB_BASE = "https://api.themoviedb.org/3";
const DEFAULT_DYNAMIC_LIMIT = 60;

async function fetchTmdb(pathname, params = {}) {
  const apiKey = getRequiredServerEnv("TMDB_API_KEY");
  const query = new URLSearchParams({ api_key: apiKey, ...params });
  const response = await fetch(`${TMDB_BASE}${pathname}?${query.toString()}`);

  if (!response.ok) {
    throw new Error(
      `TMDB sitemap fetch failed (${response.status}) for ${pathname}`,
    );
  }

  return response.json();
}

async function fetchIdsForType(mediaType, limit = DEFAULT_DYNAMIC_LIMIT) {
  const [trending, popular] = await Promise.all([
    fetchTmdb(`/trending/${mediaType}/week`, { language: "en-US" }),
    fetchTmdb(`/${mediaType}/popular`, { language: "en-US", page: "1" }),
  ]);

  const ids = new Set();
  const combined = [...(trending?.results || []), ...(popular?.results || [])];

  for (const item of combined) {
    if (typeof item?.id !== "number") continue;
    ids.add(item.id);
    if (ids.size >= limit) break;
  }

  return Array.from(ids);
}

export async function fetchDynamicContentRoutes() {
  const [movieIds, tvIds] = await Promise.all([
    fetchIdsForType("movie"),
    fetchIdsForType("tv"),
  ]);

  return [
    ...movieIds.map((id) => `/movie/${id}`),
    ...tvIds.map((id) => `/tv/${id}`),
  ];
}
