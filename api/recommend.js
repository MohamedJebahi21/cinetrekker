/**
 * Vercel Serverless Function: /api/recommend
 * - Proxies AI prompt handling to OpenAI (server-side) to keep keys secret
 * - Asks the model for a JSON array of movie/TV title suggestions
 * - Resolves suggestions via TMDB search and filters out adult content
 */
const fetch = globalThis.fetch;

const TMDB_BASE = 'https://api.themoviedb.org/3';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { prompt, language = 'en', limit = 12 } = req.body || {};
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing prompt' });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const TMDB_KEY = process.env.TMDB_API_KEY;

  if (!OPENAI_KEY) {
    // Signal to client that no backend AI key is available so it can fallback to static file
    return res.status(404).json({ error: 'No AI backend configured' });
  }

  if (!TMDB_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured on server' });
  }

  try {
    const system = `You are a helpful film expert. Given a short user prompt, return a strict JSON object with two keys: \"summary\" (a short 1-2 sentence summary as a film critic, no more than ~140 characters) and \"suggestions\" (an array of up to ${limit} items). Each suggestion must be an object with keys: \"title\" (string), optionally \"year\" (number), and \"media_type\" which must be either \"movie\" or \"tv\". Do NOT include adult content. Output MUST be valid JSON and contain only the JSON object.`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        max_tokens: 600,
        temperature: 0.8,
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text().catch(() => '');
      return res.status(502).json({ error: 'AI request failed', detail: text });
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
    const suggestions = (parsed.suggestions || []).slice(0, limit).filter(Boolean).map(s => ({
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
      if (resolved.length >= limit) break;
      const media = sug.media_type === 'tv' ? 'tv' : 'movie';
      const searchUrl = `${TMDB_BASE}/search/${media}?api_key=${TMDB_KEY}&query=${encodeURIComponent(sug.title)}&include_adult=false&language=${encodeURIComponent(language)}`;
      try {
        const sRes = await fetch(searchUrl);
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
          overview: first.overview || '',
          vote_average: first.vote_average ?? 0,
        });

        // Context awareness: fetch recommendations to include related tags/themes
        try {
          const recUrl = `${TMDB_BASE}/${media}/${first.id}/recommendations?api_key=${TMDB_KEY}&language=${encodeURIComponent(language)}`;
          const recRes = await fetch(recUrl);
          if (recRes.ok) {
            const recJson = await recRes.json();
            for (const r of (recJson.results || [])) {
              if (resolved.length >= limit) break;
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
        const searchUrl = `${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(prompt)}&include_adult=false&language=${encodeURIComponent(language)}`;
        const sRes = await fetch(searchUrl);
        if (sRes.ok) {
          const sJson = await sRes.json();
          for (const first of (sJson.results || [])) {
            if (resolved.length >= limit) break;
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
            if (resolved.length >= limit) break;
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
