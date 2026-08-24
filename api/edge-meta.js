/**
 * Edge Meta Function — Server-Side Rendered Metadata for Movie/TV/Person Pages
 *
 * Purpose: Serve fully populated <head> metadata for content pages without requiring
 * client-side JavaScript. This allows Googlebot to see:
 *  - Unique <title> per page
 *  - Unique <meta name="description">
 *  - <link rel="canonical">
 *  - Open Graph and Twitter Card tags
 *  - JSON-LD structured data (Movie, TVSeries, Person, BreadcrumbList)
 *
 * Route: /api/edge-meta
 * Query params: url (the full request path, e.g., /movie/interstellar-157336)
 *
 * This is a Vercel Serverless Function (not edge, since we need fetch to TMDB).
 * The vercel.json rewrite sends /movie/*, /tv/*, /person/* through here first.
 */

import fs from "node:fs";
import path from "node:path";
import { getRequiredServerEnv } from "./_lib/env.js";
import { createServerLogger } from "./_lib/logger.js";

const TMDB_BASE = "https://api.themoviedb.org/3";
const BASE_URL = "https://cinetrekker.vercel.app";

const logger = createServerLogger("edge-meta");

/**
 * Load the production asset tags from dist/index.html so the SSR shell boots the
 * real (hashed) Vite bundle instead of the dev-only /src/main.tsx entry.
 * Read once per cold start and cached — dist/index.html is immutable per deploy.
 * The file is made available to this function via vercel.json functions.includeFiles.
 */
let entryAssetsCache = null;
let spaShellTemplateCache = null;

function getSpaShellTemplate() {
  if (spaShellTemplateCache) return spaShellTemplateCache;

  try {
    spaShellTemplateCache = fs.readFileSync(
      path.join(process.cwd(), "dist/index.html"),
      "utf8",
    );
  } catch (error) {
    logger.error("[edge-meta] Failed to read SPA shell:", error?.message || error);
    spaShellTemplateCache = "";
  }

  return spaShellTemplateCache;
}

function getEntryAssets() {
  if (entryAssetsCache) return entryAssetsCache;

  const result = { headTags: "", scriptTag: "" };
  try {
    const html = fs.readFileSync(
      path.join(process.cwd(), "dist/index.html"),
      "utf8",
    );
    const linkTags = html.match(/<link\b[^>]*\bhref="\/assets\/[^"]*"[^>]*>/g) || [];
    const scriptTags = html.match(/<script\b[^>]*\bsrc="\/assets\/[^"]*"[^>]*>[\s\S]*?<\/script>/g) || [];
    result.headTags = linkTags.join("\n    ");
    result.scriptTag = scriptTags[0] || "";
    if (!result.headTags && !result.scriptTag) {
      logger.warn("[edge-meta] No /assets/ tags found in dist/index.html");
    }
  } catch (error) {
    logger.error("[edge-meta] Failed to read dist/index.html:", error?.message || error);
  }

  entryAssetsCache = result;
  return result;
}

/**
 * Slugify a title (matches src/lib/seo.ts slugifySegment).
 */
function slugify(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Parse a path like /movie/interstellar-157336, /movie/157336, or /movie/157336/interstellar
 */
function parseContentPath(pathname) {
  const parts = pathname.replace(/^\/+/, "").split("/");

  if (parts.length < 2) return null;

  const mediaType = parts[0]; // movie, tv, person
  if (!["movie", "tv", "person"].includes(mediaType)) return null;

  const pathId = parts.length >= 2 ? parts[1] : null;
  if (!pathId) return null;

  // Try new format: /movie/{slug}-{id}
  const newFormat = pathId.match(/^(.+)-(\d{1,10})$/);
  if (newFormat) {
    return {
      mediaType,
      id: parseInt(newFormat[2], 10),
      slug: newFormat[1] || undefined,
      legacyId: null,
      legacySlug: undefined,
    };
  }

  // Try numeric-only: /movie/12345
  const numeric = parseInt(pathId, 10);
  if (Number.isFinite(numeric) && numeric > 0) {
    const slug = parts.length >= 3 ? parts[2] : undefined;
    return {
      mediaType,
      id: numeric,
      slug: undefined,
      legacyId: numeric,
      legacySlug: slug,
    };
  }

  return null;
}

async function fetchTmdb(pathname, params = {}) {
  const apiKey = getRequiredServerEnv("TMDB_API_KEY");
  const query = new URLSearchParams({ api_key: apiKey, ...params });
  const response = await fetch(`${TMDB_BASE}${pathname}?${query.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`TMDB fetch failed (${response.status}) for ${pathname}`);
  }

  return response.json();
}

/**
 * Sanitize text for use in meta tags.
 */
function sanitizeMeta(text, maxLen = 300) {
  if (!text) return "";
  return String(text)
    .replace(/</g, "\u003c")
    .replace(/>/g, "\u003e")
    .replace(/"/g, "\u0022")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

/**
 * Build the complete HTML head section for a movie or TV page.
 */
function buildLegacyHeadHtml({ title, description, image, canonical, type, releaseDate, rating, jsonLd }) {
  const siteName = "CineTrekker";
  const safeTitle = sanitizeMeta(title || `${siteName} Movie Tracker`);
  const fullTitle = safeTitle.includes(siteName) ? safeTitle : `${safeTitle} | ${siteName}`;
  const safeDesc = sanitizeMeta(description || "Track movies and TV shows on CineTrekker.", 320);
  const safeImage = image || `${BASE_URL}/og-image.png`;
  const ogType = type === "tv" ? "video.tv_show" : type === "person" ? "profile" : type === "website" ? "website" : "video.movie";
  const safeCanonical = canonical || BASE_URL;

  // Escape JSON-LD for safe inline script
  const jsonLdStr = jsonLd ? JSON.stringify(jsonLd).replace(/</g, "\\u003c").replace(/>/g, "\\u003e") : "";

  const { headTags, scriptTag } = getEntryAssets();

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${fullTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href="${safeCanonical}" />

  <!-- Open Graph -->
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="${siteName}" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:width" content="500" />
  <meta property="og:image:height" content="750" />
  <meta property="og:url" content="${safeCanonical}" />
  ${releaseDate ? `<meta property="video:release_date" content="${releaseDate}" />` : ""}
  ${rating ? `<meta property="video:rating" content="${rating}" />` : ""}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${fullTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImage}" />

  <!-- Favicon -->
  <link rel="icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

  <!-- Preconnect for TMDB images -->
  <link rel="preconnect" href="https://image.tmdb.org" />

  ${headTags}
  <script defer src="/boot-watchdog.js"></script>

  ${jsonLdStr ? `<script type="application/ld+json" data-cinetrekker-jsonld="true">${jsonLdStr}</script>` : ""}

  <!-- Standard SPA shell placeholder — React will hydrate over this -->
  <style>
    body { background: #0a0a0a; color: #fafafa; font-family: system-ui, -apple-system, sans-serif; }
    .app-shell { display: flex; flex-direction: column; min-height: 100vh; }
    .loading-header { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.5rem; }
    .loading-logo { font-size: 1.5rem; font-weight: 900; color: #e50914; }
    .loading-title { font-size: 1.125rem; font-weight: 700; }
    .loading-content { flex: 1; padding: 2rem; }
    .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 0.75rem; }
    .text-skeleton { height: 1rem; margin-bottom: 0.75rem; }
    .text-skeleton-title { width: 60%; height: 2rem; }
    .text-skeleton-subtitle { width: 40%; }
    .loading-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-top: 2rem; }
    .card-skeleton { aspect-ratio: 2/3; }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  </style>
</head>
<body>
  <div id="root">
    <div class="app-shell" id="app-shell">
      <header class="loading-header">
        <div class="loading-logo" aria-hidden="true">CT</div>
        <div class="loading-title">CineTrekker</div>
      </header>
      <main class="loading-content">
        <div class="text-skeleton text-skeleton-title skeleton"></div>
        <div class="text-skeleton text-skeleton-subtitle skeleton"></div>
        <div class="loading-grid" role="status" aria-label="Loading content">
          <div class="card-skeleton skeleton" aria-hidden="true"></div>
          <div class="card-skeleton skeleton" aria-hidden="true"></div>
          <div class="card-skeleton skeleton" aria-hidden="true"></div>
          <div class="card-skeleton skeleton" aria-hidden="true"></div>
        </div>
      </main>
    </div>
  </div>
  ${scriptTag}
</body>
</html>`;
}

function escapeHtmlAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/\"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Render direct content pages from the exact Vite document generated for the
 * current deployment. The application boot sequence and module-preload order
 * then stay identical to standard SPA routes; only crawlable metadata varies.
 */
function buildHeadHtml({ title, description, image, canonical, type, releaseDate, rating, jsonLd }) {
  const shell = getSpaShellTemplate();
  if (!shell) {
    return buildLegacyHeadHtml({ title, description, image, canonical, type, releaseDate, rating, jsonLd });
  }

  const siteName = "CineTrekker";
  const safeTitle = sanitizeMeta(title || `${siteName} Movie Tracker`, 180);
  const fullTitle = safeTitle.includes(siteName) ? safeTitle : `${safeTitle} | ${siteName}`;
  const safeDescription = sanitizeMeta(description || "Track movies and TV shows on CineTrekker.", 320);
  const safeCanonical = canonical || BASE_URL;
  const safeImage = image || `${BASE_URL}/og-image.png`;
  const ogType = type === "tv" ? "video.tv_show" : type === "person" ? "profile" : type === "website" ? "website" : "video.movie";
  const jsonLdStr = jsonLd
    ? JSON.stringify(jsonLd).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")
    : "";

  const metadata = `
    <meta name="description" content="${escapeHtmlAttribute(safeDescription)}" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <link rel="canonical" href="${escapeHtmlAttribute(safeCanonical)}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:title" content="${escapeHtmlAttribute(fullTitle)}" />
    <meta property="og:description" content="${escapeHtmlAttribute(safeDescription)}" />
    <meta property="og:image" content="${escapeHtmlAttribute(safeImage)}" />
    <meta property="og:url" content="${escapeHtmlAttribute(safeCanonical)}" />
    ${releaseDate ? `<meta property="video:release_date" content="${escapeHtmlAttribute(releaseDate)}" />` : ""}
    ${rating ? `<meta property="video:rating" content="${escapeHtmlAttribute(rating)}" />` : ""}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtmlAttribute(fullTitle)}" />
    <meta name="twitter:description" content="${escapeHtmlAttribute(safeDescription)}" />
    <meta name="twitter:image" content="${escapeHtmlAttribute(safeImage)}" />
    ${jsonLdStr ? `<script type="application/ld+json" data-cinetrekker-jsonld="true">${jsonLdStr}</script>` : ""}
  `;

  return shell
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttribute(fullTitle)}</title>`)
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+name=["']robots["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+(?:property|name)=["'](?:og:[^"']+|twitter:[^"']+)["'][^>]*>\s*/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>\s*/gi, "")
    .replace("</head>", `${metadata}\n  </head>`);
}

/**
 * Fetch movie details from TMDB and build metadata.
 */
async function buildMovieMeta(id) {
  const data = await fetchTmdb(`/movie/${id}`, {
    language: "en-US",
    append_to_response: "credits,release_dates",
  });

  const title = data.title || "Untitled";
  const slug = slugify(title);
  const canonicalPath = `/movie/${slug}-${id}`;
  const canonical = `${BASE_URL}${canonicalPath}`;
  const image = data.poster_path
    ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
    : null;

  // Build description
  const releaseDate = data.release_date || "";
  const year = releaseDate ? new Date(releaseDate).getFullYear() : "";
  const rating = data.vote_average || 0;
  const overview = data.overview || "";
  const description = [overview, releaseDate ? `Release: ${releaseDate}.` : "", rating > 0 ? `Rating: ${rating.toFixed(1)}/10.` : ""]
    .filter(Boolean).join(" ").slice(0, 320);

  // Genres
  const genres = (data.genres || []).map((g) => g.name);

  // Directors
  const directors = (data.credits?.crew || [])
    .filter((c) => c.job === "Director" && c.name)
    .map((c) => ({ "@type": "Person", name: sanitizeMeta(c.name, 120) }));

  // Top cast
  const actors = (data.credits?.cast || [])
    .slice(0, 5)
    .filter((c) => c.name)
    .map((c) => ({
      "@type": "Person",
      name: sanitizeMeta(c.name, 120),
      ...(c.character ? { characterName: sanitizeMeta(c.character, 120) } : {}),
    }));

  // Content rating
  let contentRating;
  const usReleases = (data.release_dates?.results || []).find((r) => r.iso_3166_1 === "US");
  if (usReleases?.release_dates) {
    const cert = usReleases.release_dates.find((d) => d.certification)?.certification;
    if (cert) contentRating = cert;
  }

  const durationMin = data.runtime;

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: sanitizeMeta(title, 180),
    url: canonical,
    image: image || undefined,
    description: sanitizeMeta(overview, 500) || undefined,
    datePublished: releaseDate || undefined,
    genre: genres.length > 0 ? genres : undefined,
    contentRating: contentRating || undefined,
    duration: durationMin ? `PT${durationMin}M` : undefined,
    ...(directors.length > 0 ? { director: directors.length === 1 ? directors[0] : directors } : {}),
    ...(actors.length > 0 ? { actor: actors } : {}),
    ...(rating > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.toFixed(1),
        bestRating: "10",
        worstRating: "0",
        ratingCount: String(data.vote_count || 1),
      },
    } : {}),
  };

  // Breadcrumb
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Movies", item: `${BASE_URL}/search?type=movie` },
      { "@type": "ListItem", position: 3, name: sanitizeMeta(title, 120), item: canonical },
    ],
  };

  // Website schema
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    name: "CineTrekker",
    url: BASE_URL,
  };

  return {
    title,
    description,
    image: image || undefined,
    canonical,
    type: "movie",
    releaseDate: releaseDate || undefined,
    rating: rating > 0 ? rating.toFixed(1) : undefined,
    jsonLd: [jsonLd, breadcrumb, website],
    redirectCanonical: null, // Already on canonical
  };
}

/**
 * Fetch TV details from TMDB and build metadata.
 */
async function buildTVMeta(id) {
  const data = await fetchTmdb(`/tv/${id}`, {
    language: "en-US",
    append_to_response: "credits,content_ratings",
  });

  const title = data.name || "Untitled";
  const slug = slugify(title);
  const canonicalPath = `/tv/${slug}-${id}`;
  const canonical = `${BASE_URL}${canonicalPath}`;
  const image = data.poster_path
    ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
    : null;

  const releaseDate = data.first_air_date || "";
  const year = releaseDate ? new Date(releaseDate).getFullYear() : "";
  const rating = data.vote_average || 0;
  const overview = data.overview || "";
  const description = [overview, releaseDate ? `First aired: ${releaseDate}.` : "", rating > 0 ? `Rating: ${rating.toFixed(1)}/10.` : ""]
    .filter(Boolean).join(" ").slice(0, 320);

  const genres = (data.genres || []).map((g) => g.name);

  // Creators
  const creators = (data.created_by || [])
    .filter((c) => c.name)
    .map((c) => ({ "@type": "Person", name: sanitizeMeta(c.name, 120) }));

  // Top cast
  const actors = (data.credits?.cast || [])
    .slice(0, 5)
    .filter((c) => c.name)
    .map((c) => ({
      "@type": "Person",
      name: sanitizeMeta(c.name, 120),
      ...(c.character ? { characterName: sanitizeMeta(c.character, 120) } : {}),
    }));

  // Content rating
  let contentRating;
  const usRating = (data.content_ratings?.results || []).find((r) => r.iso_3166_1 === "US");
  if (usRating?.rating) contentRating = usRating.rating;

  const durationMin = data.episode_run_time?.[0];

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: sanitizeMeta(title, 180),
    url: canonical,
    image: image || undefined,
    description: sanitizeMeta(overview, 500) || undefined,
    datePublished: releaseDate || undefined,
    genre: genres.length > 0 ? genres : undefined,
    contentRating: contentRating || undefined,
    duration: durationMin ? `PT${durationMin}M` : undefined,
    ...(creators.length > 0 ? { creator: creators.length === 1 ? creators[0] : creators } : {}),
    ...(actors.length > 0 ? { actor: actors } : {}),
    ...(rating > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.toFixed(1),
        bestRating: "10",
        worstRating: "0",
        ratingCount: String(data.vote_count || 1),
      },
    } : {}),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "TV Shows", item: `${BASE_URL}/search?type=tv` },
      { "@type": "ListItem", position: 3, name: sanitizeMeta(title, 120), item: canonical },
    ],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    name: "CineTrekker",
    url: BASE_URL,
  };

  return {
    title,
    description,
    image: image || undefined,
    canonical,
    type: "tv",
    releaseDate: releaseDate || undefined,
    rating: rating > 0 ? rating.toFixed(1) : undefined,
    jsonLd: [jsonLd, breadcrumb, website],
    redirectCanonical: null,
  };
}

/**
 * Fetch person details from TMDB and build metadata.
 */
async function buildPersonMeta(id) {
  const data = await fetchTmdb(`/person/${id}`, {
    language: "en-US",
    append_to_response: "combined_credits",
  });

  const name = data.name || "Unknown";
  const slug = slugify(name);
  const canonicalPath = `/person/${slug}-${id}`;
  const canonical = `${BASE_URL}${canonicalPath}`;
  const image = data.profile_path
    ? `https://image.tmdb.org/t/p/w500${data.profile_path}`
    : null;
  const biography = data.biography || "";
  const knownFor = data.known_for_department || "Actor";
  const description = `Learn about ${name}, ${knownFor}. ${biography.slice(0, 200)}` || undefined;

  // Known for titles
  const knownForTitles = (data.combined_credits?.cast || [])
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    .slice(0, 5)
    .filter((c) => c.title || c.name)
    .map((c) => c.title || c.name);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: sanitizeMeta(name, 180),
    url: canonical,
    image: image || undefined,
    description: sanitizeMeta(description || `Profile of ${name}`, 500) || undefined,
    ...(data.birthday ? { birthDate: data.birthday } : {}),
    ...(data.place_of_birth ? { birthPlace: sanitizeMeta(data.place_of_birth, 120) } : {}),
    ...(knownForTitles.length > 0 ? { knowsAbout: knownForTitles } : {}),
    ...(data.known_for_department ? { jobTitle: data.known_for_department } : {}),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "People", item: `${BASE_URL}/search?type=person` },
      { "@type": "ListItem", position: 3, name: sanitizeMeta(name, 120), item: canonical },
    ],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    name: "CineTrekker",
    url: BASE_URL,
  };

  return {
    title: name,
    description,
    image: image || undefined,
    canonical,
    type: "person",
    releaseDate: undefined,
    rating: undefined,
    jsonLd: [jsonLd, breadcrumb, website],
    redirectCanonical: null,
  };
}

function buildMovieTrackerMeta() {
  const canonical = `${BASE_URL}/movie-tracker`;
  const description = "Track movies, TV shows, watchlists, and episode progress in one free, focused place. Explore CineTrekker before you sign up.";

  return {
    title: "Free Movie & TV Show Tracker",
    description,
    image: `${BASE_URL}/og-image.png`,
    canonical,
    type: "website",
    releaseDate: undefined,
    rating: undefined,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Free Movie & TV Show Tracker",
        description,
        url: canonical,
        isPartOf: {
          "@type": "WebSite",
          name: "CineTrekker",
          url: BASE_URL,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Movie & TV Show Tracker", item: canonical },
        ],
      },
    ],
    redirectCanonical: null,
  };
}

export default async function handler(req, res) {
  // Only handle GET requests
  if (req.method !== "GET") {
    return res.status(405).send("Method not allowed");
  }

  // Extract the request URL
  const url = new URL(req.url, BASE_URL);
  const pathname = url.pathname;

  if (pathname === "/movie-tracker") {
    const html = buildHeadHtml(buildMovieTrackerMeta());
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.status(200).send(html);
  }

  // Parse the path to determine what content we're dealing with
  const parsed = parseContentPath(pathname);

  if (!parsed) {
    // Not a content page, skip to SPA shell
    return res.status(404).send("Not found");
  }

  const { mediaType, id, slug } = parsed;

  try {
    let meta;
    switch (mediaType) {
      case "movie":
        meta = await buildMovieMeta(id);
        break;
      case "tv":
        meta = await buildTVMeta(id);
        break;
      case "person":
        meta = await buildPersonMeta(id);
        break;
      default:
        return res.status(404).send("Unknown media type");
    }

    // If the URL is a legacy numeric one (e.g., /movie/157336) or uses old slug format (/movie/157336/interstellar),
    // redirect to the canonical slug-based URL
    const expectedSlug = slugify(meta.title);
    const expectedPath = `/${mediaType}/${expectedSlug}-${id}`;

    if (pathname !== expectedPath) {
      // Also handle legacy /movie/{id}/{slug?} → /movie/{slug}-{id}
      const legacyPattern = new RegExp(`^/${mediaType}/${id}(/.*)?$`);
      if (legacyPattern.test(pathname)) {
        res.writeHead(301, { Location: expectedPath });
        return res.end();
      }

      // If it's some other variant, still redirect
      res.writeHead(301, { Location: expectedPath });
      return res.end();
    }

    // Build the full HTML with server-rendered metadata
    const html = buildHeadHtml(meta);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // The HTML points at deployment-hashed assets. Cache it neither at the
    // edge nor in browsers so direct content links never retain a previous
    // deployment's entry bundle after a release.
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.status(200).send(html);
  } catch (error) {
    logger.error(`[edge-meta] Error for ${pathname}:`, error?.message || error);

    // Fall through to SPA shell on error
    const { headTags, scriptTag } = getEntryAssets();
    return res.status(200).send(`
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CineTrekker</title>
  <meta name="robots" content="noindex,nofollow" />
  <link rel="canonical" href="${BASE_URL}${pathname}" />

  ${headTags}
  <script defer src="/boot-watchdog.js"></script>
</head>
<body>
  <div id="root"></div>
  ${scriptTag}
</body>
</html>
`);
  }
}