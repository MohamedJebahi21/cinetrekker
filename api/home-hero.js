import fs from "node:fs";
import path from "node:path";
import { getServerEnv } from "./_lib/env.js";
import { createServerLogger } from "./_lib/logger.js";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const logger = createServerLogger("home-hero");
let shellCache = null;
let heroCache = null;

function getSpaShell() {
  if (shellCache !== null) return shellCache;

  try {
    shellCache = fs.readFileSync(path.join(process.cwd(), "dist/index.html"), "utf8");
  } catch (error) {
    logger.error("Unable to read the Home SPA shell.", error?.message || error);
    shellCache = "";
  }

  return shellCache;
}

function escapeHtmlAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function getHeroPreloadUrl() {
  const now = Date.now();
  if (heroCache && now - heroCache.createdAt < 5 * 60 * 1000) {
    return heroCache.url;
  }

  const apiKey = getServerEnv("TMDB_API_KEY");
  if (!apiKey) return null;

  const params = new URLSearchParams({
    language: "en-US",
    page: "1",
    include_adult: "false",
  });
  const isV4Token = apiKey.includes(".");
  if (!isV4Token) params.set("api_key", apiKey);

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/all/week?${params.toString()}`,
      {
        headers: isV4Token ? { Authorization: `Bearer ${apiKey}` } : undefined,
        signal: AbortSignal.timeout(900),
      },
    );
    if (!response.ok) return null;

    const data = await response.json();
    const backdropPath = data?.results?.find(
      (item) => item?.backdrop_path && item?.adult !== true,
    )?.backdrop_path;
    if (!backdropPath || !/^\/[A-Za-z0-9._-]+$/.test(backdropPath)) return null;

    const url = `https://image.tmdb.org/t/p/w1280${backdropPath}`;
    heroCache = { url, createdAt: now };
    return url;
  } catch (error) {
    logger.warn("Home hero preload data was unavailable; serving the normal SPA shell.", {
      message: error?.message || String(error),
    });
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).send("Method not allowed");
  }

  const shell = getSpaShell();
  if (!shell) {
    return res.status(503).send("CineTrekker is temporarily unavailable.");
  }

  const heroUrl = await getHeroPreloadUrl();
  const preload = heroUrl
    ? `\n    <link rel="preload" as="image" href="${escapeHtmlAttribute(heroUrl)}" fetchpriority="high" />`
    : "";
  const html = preload ? shell.replace("</head>", `${preload}\n  </head>`) : shell;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  if (req.method === "HEAD") return res.status(200).end();
  return res.status(200).send(html);
}
