import { getRequiredServerEnv } from "./env.js";
import { fetchWithTimeout } from "./fetchWithTimeout.js";


const TMDB_BASE = "https://api.themoviedb.org/3";
const DEFAULT_DYNAMIC_LIMIT = 10000;

/**
 * Slugify a title for URL path usage (server-side, no DOMPurify needed).
 * Must match src/lib/seo.ts slugifySegment logic.
 */
function slugify(value) {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Build a SEO-friendly media path: /movie/{slug}-{id}
 */
function buildMediaPath(mediaType, id, title) {
  const slug = slugify(title);
  if (slug) {
    return `/${mediaType}/${slug}-${id}`;
  }
  return `/${mediaType}/${id}`;
}

async function fetchTmdb(pathname, params = {}) {
  const apiKey = getRequiredServerEnv("TMDB_API_KEY");
  const query = new URLSearchParams({ api_key: apiKey, ...params });
  const response = await fetchWithTimeout(
    `${TMDB_BASE}${pathname}?${query.toString()}`,
    { headers: { Accept: "application/json" } },
    8_000,
  );

  if (!response.ok) {
    throw new Error(
      `TMDB sitemap fetch failed (${response.status}) for ${pathname}`,
    );
  }

  return response.json();
}

/**
 * Collect unique IDs and their titles from multiple TMDB sources.
 * Deduplicates by ID. Returns array of { id, title, mediaType, lastmod }.
 */
async function collectTitlesForType(mediaType, limit = 10000) {
  // Fetch from multiple sources for better coverage
  const sources = [
    fetchTmdb(`/trending/${mediaType}/day`, { language: "en-US" }).catch(() => ({ results: [] })),
    fetchTmdb(`/trending/${mediaType}/week`, { language: "en-US" }).catch(() => ({ results: [] })),
    fetchTmdb(`/${mediaType}/popular`, { language: "en-US", page: "1" }).catch(() => ({ results: [] })),
    fetchTmdb(`/${mediaType}/top_rated`, { language: "en-US", page: "1" }).catch(() => ({ results: [] })),
  ];

  // Add "now playing" for movies, "airing today" / "on the air" for TV
  if (mediaType === "movie") {
    sources.push(
      fetchTmdb(`/movie/now_playing`, { language: "en-US", page: "1" }).catch(() => ({ results: [] })),
      fetchTmdb(`/movie/upcoming`, { language: "en-US", page: "1" }).catch(() => ({ results: [] })),
    );
  } else {
    sources.push(
      fetchTmdb(`/tv/airing_today`, { language: "en-US", page: "1" }).catch(() => ({ results: [] })),
      fetchTmdb(`/tv/on_the_air`, { language: "en-US", page: "1" }).catch(() => ({ results: [] })),
    );
  }

  const results = await Promise.allSettled(sources);
  const seen = new Map();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const data = result.value;
    if (!data?.results) continue;

    for (const item of data.results) {
      if (typeof item?.id !== "number") continue;
      if (seen.has(item.id)) continue;

      const title = item.title || item.name || "";
      const release = item.release_date || item.first_air_date || "";
      seen.set(item.id, {
        id: item.id,
        title,
        mediaType,
        lastmod: release ? new Date(release).toISOString().slice(0, 10) : null,
      });

      if (seen.size >= limit) break;
    }
    if (seen.size >= limit) break;
  }

  return Array.from(seen.values());
}

/**
 * Fetch dynamic content routes with slug-based paths.
 * Returns routes as /movie/{slug}-{id} or /tv/{slug}-{id}.
 */
export async function fetchDynamicContentRoutes(limit = DEFAULT_DYNAMIC_LIMIT) {
  const [movieEntries, tvEntries] = await Promise.all([
    collectTitlesForType("movie", limit),
    collectTitlesForType("tv", limit),
  ]);

  const routes = [];

  for (const entry of movieEntries) {
    routes.push({
      path: buildMediaPath("movie", entry.id, entry.title),
      lastmod: entry.lastmod,
    });
  }

  for (const entry of tvEntries) {
    routes.push({
      path: buildMediaPath("tv", entry.id, entry.title),
      lastmod: entry.lastmod,
    });
  }

  // Sort by path to ensure stable ordering in sitemap
  routes.sort((a, b) => a.path.localeCompare(b.path));

  return routes;
}

// Keep backward-compatible export for callers expecting plain path arrays
export async function fetchDynamicContentPaths(limit = DEFAULT_DYNAMIC_LIMIT) {
  const routes = await fetchDynamicContentRoutes(limit);
  return routes.map((r) => r.path);
}