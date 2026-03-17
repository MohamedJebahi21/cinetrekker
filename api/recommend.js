/**
 * Vercel Serverless Function: /api/recommend
 * - Proxies AI prompt handling to OpenAI (server-side) to keep keys secret
 * - Asks the model for a JSON array of movie/TV title suggestions
 * - Resolves suggestions via TMDB search and filters out adult content
 */
import fs from "node:fs";
import path from "node:path";
import { enforceRequestSecurity } from "./_lib/requestSecurity.js";

const fetch = globalThis.fetch;

const TMDB_BASE = "https://api.themoviedb.org/3";
const MAX_PROMPT_LENGTH = 500;
const MAX_LIMIT = 20;
const MIN_LIMIT = 1;

// Validate required environment variables on module load
const REQUIRED_ENV_VARS = ["OPENAI_API_KEY", "TMDB_API_KEY"];
const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missingVars.length > 0 && process.env.NODE_ENV === "production") {
  console.error(
    `❌ Missing required environment variables: ${missingVars.join(", ")}`,
  );
  console.error(
    "Configure these in Vercel Dashboard → Settings → Environment Variables",
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) {
    return res.status(403).send("Forbidden");
  }

  const clientKey = getClientIdentifier(req);
  const limitCheck = await isRateLimitedDistributed(`recommend:${clientKey}`);
  if (limitCheck.limited) {
    res.setHeader("Retry-After", String(limitCheck.retryAfter));
    return res
      .status(429)
      .json({ error: "Too many requests. Please try again later." });
  }

  const { prompt, language = "en", limit = 12 } = req.body || {};
  if (!prompt || typeof prompt !== "string")
    return res.status(400).json({ error: "Missing prompt" });

  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt)
    return res.status(400).json({ error: "Missing prompt" });
  if (normalizedPrompt.length > MAX_PROMPT_LENGTH) {
    return res
      .status(400)
      .json({ error: `Prompt exceeds ${MAX_PROMPT_LENGTH} characters` });
  }

  const normalizedLimit = Number.isFinite(Number(limit))
    ? Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Number(limit)))
    : 12;

  const OPENAI_ID = process.env.OPENAI_API_KEY;
  const TMDB_ID = process.env.TMDB_API_KEY;

  // Generic error to prevent enumeration of which services are configured
  if (!OPENAI_ID || !TMDB_ID) {
    return res.status(503).json({ error: "Service temporarily unavailable" });
  }

  try {
    const system = `You are a helpful film expert. Given a short user prompt, return a strict JSON object with two keys: \"summary\" (a short 1-2 sentence summary as a film critic, no more than ~140 characters) and \"suggestions\" (an array of up to ${normalizedLimit} items). Each suggestion must be an object with keys: \"title\" (string), optionally \"year\" (number), and \"media_type\" which must be either \"movie\" or \"tv\". Do NOT include adult content. Output MUST be valid JSON and contain only the JSON object.`;

    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_ID}`,
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

    // Attempt to parse JSON object { summary, suggestions }
    let parsed = { summary: "", suggestions: [] };
    try {
      const obj = JSON.parse(content);
      if (obj && typeof obj === "object") {
        parsed.summary = String(obj.summary || "");
        parsed.suggestions = Array.isArray(obj.suggestions)
          ? obj.suggestions
          : [];
      }
    } catch (e) {
      // Fallback: try to extract JSON object or array
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          const obj = JSON.parse(objMatch[0]);
          parsed.summary = String(obj.summary || "");
          parsed.suggestions = Array.isArray(obj.suggestions)
            ? obj.suggestions
            : [];
        } catch (e2) {
          parsed = { summary: content.slice(0, 140), suggestions: [] };
        }
      } else {
        parsed = { summary: content.slice(0, 140), suggestions: [] };
      }
    }

    // Limit and sanitize suggestions
    const suggestions = (parsed.suggestions || [])
      .slice(0, normalizedLimit)
      .filter(Boolean)
      .map((s) => ({
        title: (s.title || s.name || "").toString(),
        year: s.year || s.y || null,
        media_type:
          s.media_type === "tv" || s.media_type === "movie"
            ? s.media_type
            : s.type === "tv"
              ? "tv"
              : "movie",
      }))
      .filter((item) => item.title && item.title.length > 0);

    // Resolve suggestions to TMDB search results, filtering adult content and adding context-aware recommendations
    const resolved = [];
    const seen = new Set();

    const pushIfNew = (item) => {
      const key = `${item.media_type}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      resolved.push(item);
      return true;
    };

    for (const sug of suggestions) {
      if (resolved.length >= normalizedLimit) break;
      const media = sug.media_type === "tv" ? "tv" : "movie";
      const searchUrl = `${TMDB_BASE}/search/${media}?query=${encodeURIComponent(sug.title)}&include_adult=false&language=${encodeURIComponent(language)}`;
      try {
        const sRes = await fetch(searchUrl, {
          headers: {
            Authorization: `Bearer ${TMDB_ID}`,
          },
        });
        if (!sRes.ok) continue;
        const sJson = await sRes.json();
        const first = (sJson.results || [])[0];
        if (!first) continue;
        if (first.adult) continue; // explicit filter

        pushIfNew({
          id: first.id,
          media_type: media,
          title: first.title || first.name || sug.title,
          poster_path: first.poster_path || null,
          overview: first.overview || "",
          vote_average: first.vote_average ?? 0,
        });

        // Context awareness: fetch recommendations to include related tags/themes
        try {
          const recUrl = `${TMDB_BASE}/${media}/${first.id}/recommendations?language=${encodeURIComponent(language)}`;
          const recRes = await fetch(recUrl, {
            headers: {
              Authorization: `Bearer ${TMDB_ID}`,
            },
          });
          if (recRes.ok) {
            const recJson = await recRes.json();
            for (const r of recJson.results || []) {
              if (resolved.length >= normalizedLimit) break;
              if (r.adult) continue;
              pushIfNew({
                id: r.id,
                media_type: media,
                title: r.title || r.name || "",
                poster_path: r.poster_path || null,
                overview: r.overview || "",
                vote_average: r.vote_average ?? 0,
              });
            }
          }
        } catch (e) {
          // ignore recommendation errors
        }
      } catch (err) {
        // ignore and continue
        continue;
      }
    }

    // Hybrid fallback: if AI suggestions didn't resolve, perform a TMDB multi search using the raw prompt
    if (resolved.length === 0) {
      try {
        const searchUrl = `${TMDB_BASE}/search/multi?query=${encodeURIComponent(normalizedPrompt)}&include_adult=false&language=${encodeURIComponent(language)}`;
        const sRes = await fetch(searchUrl, {
          headers: {
            Authorization: `Bearer ${TMDB_ID}`,
          },
        });
        if (sRes.ok) {
          const sJson = await sRes.json();
          for (const first of sJson.results || []) {
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
      } catch (e) {
        // ignore
      }
    }

    // Final fallback: static bundled suggestions to ensure UI never shows 0 results
    if (resolved.length === 0) {
      try {
        // Read bundled static fallback from filesystem (server-side)
        const p = path.join(process.cwd(), "public", "api", "recommend.json");
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, "utf8");
          const data = JSON.parse(raw || "[]");
          for (const d of data || []) {
            if (resolved.length >= normalizedLimit) break;
            pushIfNew({
              id: d.id,
              media_type: d.media_type || "movie",
              title: d.title || d.name || "",
              poster_path: d.poster_path || null,
              overview: d.overview || "",
              vote_average: d.vote_average ?? 0,
            });
          }
        }
      } catch (e) {
        // ignore; if still empty we'll return empty array
      }
    }

    // Return summary and resolved suggestions
    return res
      .status(200)
      .json({ summary: parsed.summary || "", results: resolved });
  } catch (err) {
    console.error("recommend function error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
