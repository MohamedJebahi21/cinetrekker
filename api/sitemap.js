import { validateEnv } from "./_lib/validateEnv.js";
import { fetchDynamicContentRoutes } from "./_lib/tmdbSitemap.js";
import { getServerEnv } from "./_lib/env.js";
import { createServerLogger } from "./_lib/logger.js";

const BASE_URL = getServerEnv("APP_BASE_URL", "https://cinetrekker.vercel.app");
const logger = createServerLogger("sitemap");

// Static routes that are indexable (auth-only pages and user-specific pages removed)
const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/search", changefreq: "weekly", priority: "0.6" },
  { path: "/trending", changefreq: "daily", priority: "0.9" },
  { path: "/genres", changefreq: "weekly", priority: "0.7" },
  { path: "/decades", changefreq: "weekly", priority: "0.6" },
  { path: "/awards", changefreq: "weekly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.4" },
  { path: "/privacy", changefreq: "monthly", priority: "0.3" },
  { path: "/terms", changefreq: "monthly", priority: "0.3" },
  { path: "/cookies", changefreq: "monthly", priority: "0.3" },
  { path: "/accessibility", changefreq: "monthly", priority: "0.4" },
  { path: "/discover", changefreq: "weekly", priority: "0.8" },
  { path: "/movie-tracker", changefreq: "monthly", priority: "0.8" },
  { path: "/people", changefreq: "weekly", priority: "0.6" },
  { path: "/calendar", changefreq: "daily", priority: "0.7" },
];

// Last modified dates for static routes
const STATIC_LASTMOD = {
  "/": "2026-06-01",
  "/search": "2026-06-01",
  "/trending": "2026-06-01",
  "/genres": "2026-06-01",
  "/decades": "2026-06-01",
  "/awards": "2026-06-01",
  "/about": "2026-05-01",
  "/privacy": "2026-05-01",
  "/terms": "2026-05-01",
  "/cookies": "2026-05-01",
  "/accessibility": "2026-05-01",
  "/discover": "2026-06-01",
  "/movie-tracker": "2026-08-21",
  "/people": "2026-08-20",
  "/calendar": "2026-08-20",
};

/**
 * Escape a string for safe use in XML content.
 * Escapes: & < > " '
 */
function xmlEscape(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;")
    .replace(/'/g, "\u0026apos;");
}

/**
 * Generate a single sitemap XML string for a set of URLs.
 */
function toSitemapXml(urls) {
  const urlElements = urls
    .map(
      ({ loc, lastmod, changefreq, priority }) =>
        `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n    <lastmod>${xmlEscape(lastmod)}</lastmod>\n    <changefreq>${xmlEscape(changefreq)}</changefreq>\n    <priority>${xmlEscape(priority)}</priority>\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlElements}\n</urlset>`;
}

/**
 * Generate a sitemap index XML string.
 */
function toSitemapIndexXml(sitemaps) {
  const sitemapElements = sitemaps
    .map(
      ({ loc, lastmod }) =>
        `  <sitemap>\n    <loc>${xmlEscape(loc)}</loc>\n    <lastmod>${xmlEscape(lastmod)}</lastmod>\n  </sitemap>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapElements}\n</sitemapindex>`;
}

/**
 * Chunk an array into smaller arrays of maxSize.
 */
function chunkArray(arr, maxSize = 1000) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += maxSize) {
    chunks.push(arr.slice(i, i + maxSize));
  }
  return chunks;
}

export default async function handler(_req, res) {
  const now = new Date().toISOString().slice(0, 10);
  const MAX_URLS_PER_FILE = 1000;

  // Build static URLs
  const staticUrls = STATIC_ROUTES.map((route) => ({
    loc: `${BASE_URL}${route.path}`,
    lastmod: STATIC_LASTMOD[route.path] || now,
    changefreq: route.changefreq,
    priority: route.priority,
  }));

  // Build dynamic URLs from TMDB
  let dynamicRoutes = [];
  try {
    validateEnv(["TMDB_API_KEY"]);
    dynamicRoutes = await fetchDynamicContentRoutes();
  } catch (error) {
    logger.warn(
      "Sitemap dynamic route generation fallback:",
      error?.message || error,
    );
  }

  const dynamicUrls = dynamicRoutes.map((route) => ({
    loc: `${BASE_URL}${route.path}`,
    lastmod: route.lastmod || now,
    changefreq: "daily",
    priority: "0.8",
  }));

  // Determine if we need a sitemap index (more than one chunk)
  const staticChunks = chunkArray(staticUrls, MAX_URLS_PER_FILE);
  const dynamicChunks = chunkArray(dynamicUrls, MAX_URLS_PER_FILE);
  const totalChunks = staticChunks.length + dynamicChunks.length;

  // Check if the request includes a page parameter for chunked sitemaps
  const url = new URL(_req.url, BASE_URL);
  const pageParam = url.searchParams.get("page");
  const typeParam = url.searchParams.get("type");

  if (typeParam === "static" && pageParam) {
    // Serve a specific static chunk
    const chunkIndex = parseInt(pageParam, 10) - 1;
    if (chunkIndex >= 0 && chunkIndex < staticChunks.length) {
      const xml = toSitemapXml(staticChunks[chunkIndex]);
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).send(xml);
    }
    return res.status(404).send("Sitemap chunk not found");
  }

  if (typeParam === "dynamic" && pageParam) {
    // Serve a specific dynamic chunk
    const chunkIndex = parseInt(pageParam, 10) - 1;
    if (chunkIndex >= 0 && chunkIndex < dynamicChunks.length) {
      const xml = toSitemapXml(dynamicChunks[chunkIndex]);
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).send(xml);
    }
    return res.status(404).send("Sitemap chunk not found");
  }

  if (totalChunks > 1) {
    // Serve a sitemap index — xmlEscape will encode & to & for XML validity
    const sitemaps = [];

    for (let i = 0; i < staticChunks.length; i++) {
      sitemaps.push({
        loc: `${BASE_URL}/sitemap.xml?type=static&page=${i + 1}`,
        lastmod: now,
      });
    }

    for (let i = 0; i < dynamicChunks.length; i++) {
      sitemaps.push({
        loc: `${BASE_URL}/sitemap.xml?type=dynamic&page=${i + 1}`,
        lastmod: now,
      });
    }

    const xml = toSitemapIndexXml(sitemaps);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(xml);
  }

  // Single sitemap: combine all URLs
  const allUrls = [...staticUrls, ...dynamicUrls];
  const xml = toSitemapXml(allUrls);

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).send(xml);
}