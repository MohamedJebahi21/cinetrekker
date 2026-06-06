/**
 * Vercel Serverless Function: /api/recommend
 * - Proxies AI prompt handling to OpenAI (server-side) to keep keys secret
 * - Asks the model for a JSON array of movie/TV title suggestions
 * - Resolves suggestions via TMDB search and filters out adult content
 */
import fs from "node:fs";
import path from "node:path";
import { enforceRequestSecurity } from "./_lib/requestSecurity.js";
import { getMissingServerEnv, getServerEnv } from "./_lib/env.js";
import { createServerLogger } from "./_lib/logger.js";
import { parseBody } from "./_lib/http.js";

const fetch = globalThis.fetch;
const logger = createServerLogger("recommend");

const TMDB_BASE = "https://api.themoviedb.org/3";
const MAX_PROMPT_LENGTH = 500;
const MAX_LIMIT = 20;
const MIN_LIMIT = 1;
const UPSTREAM_TIMEOUT_MS = 12_000;

const REQUIRED_ENV_VARS = ["OPENAI_API_KEY"];
const missingVars = getMissingServerEnv(REQUIRED_ENV_VARS);

if (missingVars.length > 0 && process.env.NODE_ENV === "production") {
  logger.error(`Missing required environment variables: ${missingVars.join(", ")}`);
  logger.error(
    "Configure these in Vercel Dashboard -> Settings -> Environment Variables",
  );
}

function getTmdbRequest(baseUrl, endpoint, paramsObj, token) {
  const isV4 = token.includes(".");
  const params = new URLSearchParams(paramsObj);
  if (!isV4) {
    params.set("api_key", token);
  }
  const url = `${baseUrl}${endpoint}?${params.toString()}`;
  const options = {
    headers: isV4
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" },
  };
  return { url, options };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = UPSTREAM_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  if (typeof fetch !== "function") {
    return res.status(503).json({ error: "Service temporarily unavailable" });
  }

  const security = await enforceRequestSecurity(req, res, "recommend");
  if (!security.ok) {
    return res.status(security.status).json({ error: security.error });
  }

  const body = parseBody(req);
  const { prompt, language = "en", limit = 12 } = body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }
  if (normalizedPrompt.length > MAX_PROMPT_LENGTH) {
    return res
      .status(400)
      .json({ error: `Prompt exceeds ${MAX_PROMPT_LENGTH} characters` });
  }

  const normalizedLanguage =
    typeof language === "string" && language.trim().length > 0
      ? language.trim().slice(0, 16)
      : "en";

  const normalizedLimit = Number.isFinite(Number(limit))
    ? Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Number(limit)))
    : 12;

  const openAiKey = getServerEnv("OPENAI_API_KEY");
  const tmdbKey = getServerEnv("TMDB_API_KEY");

  if (!openAiKey || !tmdbKey) {
    return res.status(503).json({ error: "Service temporarily unavailable" });
  }

  try {
    const system = `You are a helpful film expert. Given a short user prompt, return a strict JSON object with two keys: "summary" (a short 1-2 sentence summary as a film critic, no more than ~140 characters) and "suggestions" (an array of up to ${normalizedLimit} items). Each suggestion must be an object with keys: "title" (string), optionally "year" (number), and "media_type" which must be either "movie" or "tv". Do NOT include adult content. Output MUST be valid JSON and contain only the JSON object.`;

    const openaiRes = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system },
            { role: "user", content: normalizedPrompt },
          ],
          max_tokens: 600,
          temperature: 0.8,
        }),
      },
    );

    if (!openaiRes.ok) {
      return res
        .status(502)
        .json({ error: "AI service temporarily unavailable" });
    }

    const openaiJson = await openaiRes.json();
    const content =
      openaiJson?.choices?.[0]?.message?.content ||
      openaiJson?.choices?.[0]?.text ||
      "";

    let parsed = { summary: "", suggestions: [] };
    try {
      const obj = JSON.parse(content);
      if (obj && typeof obj === "object") {
        parsed.summary = String(obj.summary || "");
        parsed.suggestions = Array.isArray(obj.suggestions)
          ? obj.suggestions
          : [];
      }
    } catch {
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          const obj = JSON.parse(objMatch[0]);
          parsed.summary = String(obj.summary || "");
          parsed.suggestions = Array.isArray(obj.suggestions)
            ? obj.suggestions
            : [];
        } catch {
          parsed = { summary: content.slice(0, 140), suggestions: [] };
        }
      } else {
        parsed = { summary: content.slice(0, 140), suggestions: [] };
      }
    }

    const suggestions = (parsed.suggestions || [])
      .slice(0, normalizedLimit)
      .filter(Boolean)
      .map((suggestion) => ({
        title: (suggestion.title || suggestion.name || "").toString(),
        year: suggestion.year || suggestion.y || null,
        media_type:
          suggestion.media_type === "tv" || suggestion.media_type === "movie"
            ? suggestion.media_type
            : suggestion.type === "tv"
              ? "tv"
              : "movie",
      }))
      .filter((item) => item.title && item.title.length > 0);

    const resolved = [];
    const seen = new Set();

    const pushIfNew = (item) => {
      const key = `${item.media_type}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      resolved.push(item);
      return true;
    };

    for (const suggestion of suggestions) {
      if (resolved.length >= normalizedLimit) break;
      const media = suggestion.media_type === "tv" ? "tv" : "movie";
      const { url: searchUrl, options: searchOptions } = getTmdbRequest(
        TMDB_BASE,
        `/search/${media}`,
        {
          query: suggestion.title,
          include_adult: "false",
          language: normalizedLanguage,
        },
        tmdbKey,
      );

      try {
        const searchResponse = await fetchWithTimeout(searchUrl, searchOptions);

        if (!searchResponse.ok) continue;

        const searchJson = await searchResponse.json();
        const first = (searchJson.results || [])[0];
        if (!first || first.adult) continue;

        pushIfNew({
          id: first.id,
          media_type: media,
          title: first.title || first.name || suggestion.title,
          poster_path: first.poster_path || null,
          overview: first.overview || "",
          vote_average: first.vote_average ?? 0,
        });

        try {
          const { url: recommendationsUrl, options: recommendationsOptions } =
            getTmdbRequest(
              TMDB_BASE,
              `/${media}/${first.id}/recommendations`,
              { language: normalizedLanguage },
              tmdbKey,
            );
          const recommendationsResponse = await fetchWithTimeout(
            recommendationsUrl,
            recommendationsOptions,
          );

          if (recommendationsResponse.ok) {
            const recommendationsJson = await recommendationsResponse.json();
            for (const recommendation of recommendationsJson.results || []) {
              if (resolved.length >= normalizedLimit) break;
              if (recommendation.adult) continue;
              pushIfNew({
                id: recommendation.id,
                media_type: media,
                title: recommendation.title || recommendation.name || "",
                poster_path: recommendation.poster_path || null,
                overview: recommendation.overview || "",
                vote_average: recommendation.vote_average ?? 0,
              });
            }
          }
        } catch {
          // Recommendation expansion is best-effort only.
        }
      } catch {
        continue;
      }
    }

    if (resolved.length === 0) {
      try {
        const { url: searchUrl, options: searchOptions } = getTmdbRequest(
          TMDB_BASE,
          `/search/multi`,
          {
            query: normalizedPrompt,
            include_adult: "false",
            language: normalizedLanguage,
          },
          tmdbKey,
        );
        const searchResponse = await fetchWithTimeout(searchUrl, searchOptions);

        if (searchResponse.ok) {
          const searchJson = await searchResponse.json();
          for (const first of searchJson.results || []) {
            if (resolved.length >= normalizedLimit) break;
            if (first.adult) continue;
            const media = first.media_type === "tv" ? "tv" : "movie";
            pushIfNew({
              id: first.id,
              media_type: media,
              title: first.title || first.name || "",
              poster_path: first.poster_path || null,
              overview: first.overview || "",
              vote_average: first.vote_average ?? 0,
            });
          }
        }
      } catch {
        // Fall through to bundled fallback.
      }
    }

    if (resolved.length === 0) {
      try {
        const fallbackPath = path.join(
          process.cwd(),
          "public",
          "api",
          "recommend.json",
        );
        if (fs.existsSync(fallbackPath)) {
          const raw = fs.readFileSync(fallbackPath, "utf8");
          const data = JSON.parse(raw || "[]");
          for (const item of data || []) {
            if (resolved.length >= normalizedLimit) break;
            pushIfNew({
              id: item.id,
              media_type: item.media_type || "movie",
              title: item.title || item.name || "",
              poster_path: item.poster_path || null,
              overview: item.overview || "",
              vote_average: item.vote_average ?? 0,
            });
          }
        }
      } catch {
        // Still allow an empty result payload.
      }
    }

    return res
      .status(200)
      .json({ summary: parsed.summary || "", results: resolved });
  } catch (error) {
    logger.error("Unhandled recommendation error.", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
