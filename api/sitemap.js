import { validateEnv } from "./_lib/validateEnv.js";
import { fetchDynamicContentRoutes } from "./_lib/tmdbSitemap.js";
import { getServerEnv } from "./_lib/env.js";
import { createServerLogger } from "./_lib/logger.js";

const BASE_URL = getServerEnv("APP_BASE_URL", "https://cinetrekker.vercel.app");
const logger = createServerLogger("sitemap");

const STATIC_ROUTES = [
  "/",
  "/search",
  "/trending",
  "/about",
  "/privacy",
  "/terms",
  "/cookies",
  "/login",
  "/signup",
  "/genres",
  "/decades",
  "/awards",
  "/accessibility",
];

function toXmlUrl(loc, lastmod, changefreq, priority) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

export default async function handler(_req, res) {
  const now = new Date().toISOString();
  const urlSet = new Set(STATIC_ROUTES.map((route) => `${BASE_URL}${route}`));

  try {
    validateEnv(["TMDB_API_KEY"]);

    const dynamicRoutes = await fetchDynamicContentRoutes();
    for (const route of dynamicRoutes) {
      urlSet.add(`${BASE_URL}${route}`);
    }
  } catch (error) {
    logger.warn(
      "Sitemap dynamic route generation fallback:",
      error?.message || error,
    );
  }

  const urls = [
    ...Array.from(urlSet).map((loc) =>
      toXmlUrl(
        loc,
        now,
        loc.includes("/movie/") || loc.includes("/tv/") ? "daily" : "weekly",
        loc.endsWith("/") ? "1.0" : "0.8",
      ),
    ),
  ].join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).send(xml);
}
