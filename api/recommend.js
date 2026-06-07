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

const TMDB_BASE = 'https://api.themoviedb.org/3';
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_PROMPT_LENGTH = 500;
const MAX_LIMIT = 20;
const MIN_LIMIT = 1;
const UPSTREAM_TIMEOUT_MS = 12_000;

const requestStore = new Map();

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) {
    return realIp;
  }

  return req.socket?.remoteAddress || 'unknown';
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

  return { limited: false, retryAfter: 0 };
}

function isAllowedOrigin(origin) {
  if (!origin) return true;

  const allowedOrigins = new Set([
    'https://cinetrekker.vercel.app',
    'https://www.cinetrekker.vercel.app',
  ]);

  const isPreview = /^https:\/\/cinetrekker-[a-z0-9-]+\.vercel\.app$/.test(origin);
  const isLocal = process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:(5173|5174|8080|4173)$/.test(origin);

  return allowedOrigins.has(origin) || isPreview || isLocal;
}

// Validate required environment variables on module load
const REQUIRED_ENV_VARS = ['OPENAI_API_KEY', 'TMDB_API_KEY'];
const missingVars = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Configure these in Vercel Dashboard → Settings → Environment Variables');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  const ip = getClientIP(req);
  const limitCheck = isRateLimited(`recommend:${ip}`);
  if (limitCheck.limited) {
    res.setHeader('Retry-After', String(limitCheck.retryAfter));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const { prompt, language = 'en', limit = 12 } = req.body || {};
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing prompt' });

  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) return res.status(400).json({ error: 'Missing prompt' });
  if (normalizedPrompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: `Prompt exceeds ${MAX_PROMPT_LENGTH} characters` });
  }

  const normalizedLanguage =
    typeof language === "string" && language.trim().length > 0
      ? language.trim().slice(0, 16)
      : "en";

  const normalizedLimit = Number.isFinite(Number(limit))
    ? Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Number(limit)))
    : 12;

  const OPENAI_ID = process.env.OPENAI_API_KEY;
  const TMDB_ID = process.env.TMDB_API_KEY;

  // Generic error to prevent enumeration of which services are configured
  if (!OPENAI_ID || !TMDB_ID) {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }

  try {
    const system = `You are a helpful film expert. Given a short user prompt, return a strict JSON object with two keys: \"summary\" (a short 1-2 sentence summary as a film critic, no more than ~140 characters) and \"suggestions\" (an array of up to ${normalizedLimit} items). Each suggestion must be an object with keys: \"title\" (string), optionally \"year\" (number), and \"media_type\" which must be either \"movie\" or \"tv\". Do NOT include adult content. Output MUST be valid JSON and contain only the JSON object.`;

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
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: normalizedPrompt },
        ],
        max_tokens: 600,
        temperature: 0.8,
      }),
    });

    if (!openaiRes.ok) {
      return res.status(502).json({ error: 'AI service temporarily unavailable' });
    }

    const openaiJson = await openaiRes.json();
    const content = openaiJson?.choices?.[0]?.message?.content || openaiJson?.choices?.[0]?.text || '';

    // Attempt to parse JSON object { summary, suggestions }
    let parsed = { summary: '', suggestions: [] };
    try {
      const obj = JSON.parse(content);
      if (obj && typeof obj === 'object') {
        parsed.summary = String(obj.summary || '');
        parsed.suggestions = Array.isArray(obj.suggestions) ? obj.suggestions : [];
      }
    } catch (e) {
      // Fallback: try to extract JSON object or array
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          const obj = JSON.parse(objMatch[0]);
          parsed.summary = String(obj.summary || '');
          parsed.suggestions = Array.isArray(obj.suggestions) ? obj.suggestions : [];
        } catch (e2) {
          parsed = { summary: content.slice(0, 140), suggestions: [] };
        }
      } else {
        parsed = { summary: content.slice(0, 140), suggestions: [] };
      }
    }

    // Limit and sanitize suggestions
    const suggestions = (parsed.suggestions || []).slice(0, normalizedLimit).filter(Boolean).map(s => ({
      title: (s.title || s.name || '').toString(),
      year: s.year || s.y || null,
      media_type: (s.media_type === 'tv' || s.media_type === 'movie') ? s.media_type : (s.type === 'tv' ? 'tv' : 'movie'),
    })).filter(item => item.title && item.title.length > 0);

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
          title: first.title || first.name || sug.title,
          poster_path: first.poster_path || null,
          overview: first.overview || '',
          vote_average: first.vote_average ?? 0,
        });

        // Context awareness: fetch recommendations to include related tags/themes
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
              if (r.adult) continue;
              pushIfNew({
                id: r.id,
                media_type: media,
                title: r.title || r.name || '',
                poster_path: r.poster_path || null,
                overview: r.overview || '',
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
            const media = first.media_type === 'tv' ? 'tv' : 'movie';
            pushIfNew({
              id: first.id,
              media_type: media,
              title: first.title || first.name || '',
              poster_path: first.poster_path || null,
              overview: first.overview || '',
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
        const fs = require('fs');
        const path = require('path');
        const p = path.join(process.cwd(), 'public', 'api', 'recommend.json');
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const data = JSON.parse(raw || '[]');
          for (const d of (data || []) ) {
            if (resolved.length >= normalizedLimit) break;
            pushIfNew({
              id: d.id,
              media_type: d.media_type || 'movie',
              title: d.title || d.name || '',
              poster_path: d.poster_path || null,
              overview: d.overview || '',
              vote_average: d.vote_average ?? 0,
            });
          }
        }
      } catch (e) {
        // ignore; if still empty we'll return empty array
      }
    }

    // Return summary and resolved suggestions
    return res.status(200).json({ summary: parsed.summary || '', results: resolved });
  } catch (err) {
    console.error('recommend function error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
