import { discoverMovies, getMovieGenres, searchMovies } from '@/services/tmdb';
import type { Genre, Media, RankingResult, AIRecommendationItem, AIRecommendationResponse } from '@/types/media';

type AIExtract = { genres: string[]; moods: string[]; similar: string[] };

async function callAI(prompt: string) {
  const res = await fetch('/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error('AI call failed');
  const text = await res.text();
  // server may return JSON or raw text; try parse
  try {
    return JSON.parse(text);
  } catch {
    // try to extract JSON within text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return text;
  }
}

function mapTmdbResultToMedia(item: Media): Omit<Media, 'genres' | 'genre_ids'> {
  return {
    id: item.id,
    media_type: 'movie',
    title: item.title || item.name || '',
    poster_path: item.poster_path || item.poster_path || null,
    overview: item.overview || '',
    vote_average: item.vote_average || 0,
  };
}

export async function getAIRecommendations(prompt: string, language = 'en') {
  // 1) Ask AI to extract genres/moods/similar
  const extractPrompt = `Analyze this user request: ${prompt}. Extract the top 5 genres, 3 moods, and 2 similar movie titles. Return ONLY a JSON object with these keys: {"genres": [], "moods": [], "similar": [] }`;

  let extracted: AIExtract = { genres: [], moods: [], similar: [] };
  try {
    const aiResp = await callAI(extractPrompt);
    if (typeof aiResp === 'string') {
      try { extracted = JSON.parse(aiResp); } catch { /* ignore */ }
    } else if (aiResp && typeof aiResp === 'object') {
      extracted = {
        genres: aiResp.genres || [],
        moods: aiResp.moods || [],
        similar: aiResp.similar || [],
      };
    }
  } catch (e) {
    // fallback: empty extraction
    extracted = { genres: [], moods: [], similar: [] };
  }

  // 2) Map genre names to TMDB ids
  let genreIds: string[] = [];
  try {
    const genreList = await getMovieGenres(language);
    const nameToId = new Map<string, number>();
    (genreList.genres || []).forEach((g: Genre) => nameToId.set(g.name.toLowerCase(), g.id));
    genreIds = extracted.genres.map(g => nameToId.get(g.toLowerCase())).filter(Boolean).map(String);
  } catch (e) {
    genreIds = [];
  }

  // 3) Discover movies using genre ids (if any) and moods as keywords via popularity
  let discovered: Media[] = [];
  try {
    const params: Record<string, string> = { page: '1' };
    if (genreIds.length) params.with_genres = genreIds.join(',');
    // sorting by popularity to return mainstream choices that match genres/moods
    params.sort_by = 'popularity.desc';
    const tm = await discoverMovies(params, language);
    discovered = (tm.results || []).slice(0, 20);
  } catch (e) {
    discovered = [];
  }

  // If discovery returned nothing (or no meaningful genres extracted), try a direct search
  // Use the user's raw prompt as a fallback search query to TMDB so the results reflect the query
  const isQueryLike = (prompt || '').trim().length > 2;
  if ((discovered.length === 0 || genreIds.length === 0) && isQueryLike) {
    try {
      const searchResp = await searchMovies(prompt, 1, language);
      const searchResults = (searchResp?.results || []).slice(0, 20);
      // prefer search results when we actually have matches
      if (searchResults.length > 0) {
        // merge unique by id (search first)
        const byId = new Map<number, any>();
        searchResults.forEach((s: Media) => byId.set(s.id, s));
        discovered.forEach((d: Media) => { if (!byId.has(d.id)) byId.set(d.id, d); });
        discovered = Array.from(byId.values()).slice(0, 20);
      }
    } catch (err) {
      // ignore search failure
    }
  }

  // If AI suggested similar titles, attempt to find them directly via search and merge
  if (extracted.similar && extracted.similar.length > 0) {
    try {
      const byId = new Map<number, Media>(discovered.map((d: Media) => [d.id, d]));
      for (const title of extracted.similar.slice(0, 5)) {
        try {
          const sr = await searchMovies(title, 1, language);
          (sr.results || []).slice(0, 3).forEach((r: Media) => { if (!byId.has(r.id)) byId.set(r.id, r); });
        } catch (e) {
          // ignore per-title failure
        }
      }
      discovered = Array.from(byId.values()).slice(0, 20);
    } catch (e) {
      // ignore
    }
  }

  // 4) Prepare titles and ask AI to re-rank
  const titles = discovered.map(d => d.title || d.name).filter(Boolean).slice(0, 20);
  let ranking: { title: string; score: number; reason?: string }[] = [];
  try {
    const rankPrompt = `Original request: ${prompt}. Here are candidate movie titles: ${JSON.stringify(titles)}. Which of these 20 movies best matches the original request? Rank the top 5 and return ONLY a JSON array of objects with keys {"title","score","reason"} where score is a percentage (0-100).`;
    const rankResp = await callAI(rankPrompt);
    if (Array.isArray(rankResp)) {
      ranking = rankResp.map((r: RankingResult) => ({ title: r.title, score: Number(r.score) || 0, reason: r.reason || '' }));
    } else if (typeof rankResp === 'string') {
      try { ranking = JSON.parse(rankResp); } catch { ranking = []; }
    }
  } catch (e) {
    ranking = [];
  }

  // 5) Merge ranking with discovered results and build final items
  const finalItems = discovered.map((d: Media) => {
    const matched = ranking.find(r => (r.title || '').toLowerCase() === (d.title || '').toLowerCase());
    return {
      ...mapTmdbResultToMedia(d),
      confidence: matched ? `${Math.round(matched.score)}%` : '30%',
      ai_reason: matched ? (matched.reason || `Matches genres: ${extracted.genres.join(', ')}`) : `Suggested because of genres: ${extracted.genres.slice(0,2).join(', ')}`,
    };
  });

  // 6) Return a short summary and the results
  const summary = `Found ${finalItems.length} candidates using genres: ${extracted.genres.join(', ')} and moods: ${extracted.moods.join(', ')}`;
  return { summary, results: finalItems };
}
