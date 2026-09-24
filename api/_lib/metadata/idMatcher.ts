/**
 * Multi-Stage ID Matcher & Cross-Provider Resolver
 *
 * Implements a deterministic resolution pipeline:
 * 1. Exact Provider ID (e.g. TVmaze ID)
 * 2. IMDb ID match (gold-standard cross-provider bridge)
 * 3. Provider cross-reference (e.g. TheTVDB ID)
 * 4. Normalized Title + Year match with confidence scoring
 * 5. Safe rejection below threshold
 */

import {
  getShowByImdbId,
  getShowByThetvdbId,
  getShowDetails,
  searchShows,
  type TVmazeShow,
} from "./providers/tvmaze.ts";
import type { NormalizedExternalIds } from "./types.ts";

export interface MatchCandidate {
  show: TVmazeShow;
  confidence: number;
  matchReason: "exact_tvmaze_id" | "imdb_id" | "thetvdb_id" | "title_and_year" | "title_fuzzy";
}

/**
 * Clean and normalize a media title for robust comparison.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/^the\s+|^a\s+|^an\s+/i, "") // strip leading English articles
    .replace(/[^\w\s]/g, "") // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract release year from an ISO date string or year number.
 */
export function extractYear(dateStr?: string | number | null): number | null {
  if (!dateStr) return null;
  const str = String(dateStr);
  const match = str.match(/\b(19\d\d|20\d\d)\b/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Compute similarity between two normalized strings (Dice coefficient on bigrams).
 */
export function computeStringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;
  if (a.length < 2 || b.length < 2) return a === b ? 1.0 : 0.0;

  const getBigrams = (str: string) => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bigram = str.substring(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }
    return bigrams;
  };

  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);
  let intersectionSize = 0;

  for (const [bigram, countA] of bigramsA.entries()) {
    if (bigramsB.has(bigram)) {
      intersectionSize += Math.min(countA, bigramsB.get(bigram)!);
    }
  }

  return (2.0 * intersectionSize) / (a.length - 1 + b.length - 1);
}

/**
 * Multi-stage resolution for TVmaze shows.
 */
export async function resolveTVmazeShow(params: {
  externalIds?: NormalizedExternalIds;
  title?: string;
  year?: number | string;
}): Promise<MatchCandidate | null> {
  const { externalIds, title, year } = params;

  // Stage 1: Exact TVmaze ID
  if (externalIds?.tvmazeId) {
    const show = await getShowDetails(externalIds.tvmazeId);
    if (show) {
      return {
        show,
        confidence: 1.0,
        matchReason: "exact_tvmaze_id",
      };
    }
  }

  // Stage 2: IMDb ID match (Authoritative)
  if (externalIds?.imdbId && /^tt\d{5,10}$/.test(externalIds.imdbId)) {
    const show = await getShowByImdbId(externalIds.imdbId);
    if (show) {
      return {
        show,
        confidence: 1.0,
        matchReason: "imdb_id",
      };
    }
  }

  // Stage 3: TheTVDB ID match
  if (externalIds?.tvdbId && typeof externalIds.tvdbId === "number" && externalIds.tvdbId > 0) {
    const show = await getShowByThetvdbId(externalIds.tvdbId);
    if (show) {
      return {
        show,
        confidence: 0.95,
        matchReason: "thetvdb_id",
      };
    }
  }

  // Stage 4: Title + Year Search
  if (title && title.trim().length > 0) {
    const targetNormTitle = normalizeTitle(title);
    const targetYear = extractYear(year);

    const searchResults = await searchShows(title);
    if (searchResults && searchResults.length > 0) {
      let bestMatch: MatchCandidate | null = null;
      let highestConfidence = 0;

      for (const result of searchResults) {
        const candidateShow = result.show;
        const candidateNormTitle = normalizeTitle(candidateShow.name);
        const candidateYear = extractYear(candidateShow.premiered);

        const titleSim = computeStringSimilarity(targetNormTitle, candidateNormTitle);

        let confidence = 0;
        let reason: MatchCandidate["matchReason"] = "title_fuzzy";

        if (titleSim >= 0.95) {
          if (targetYear && candidateYear) {
            const yearDiff = Math.abs(targetYear - candidateYear);
            if (yearDiff === 0) {
              confidence = 0.92;
              reason = "title_and_year";
            } else if (yearDiff === 1) {
              confidence = 0.85;
              reason = "title_and_year";
            } else {
              // Same name but different year (remake or unrelated show)
              confidence = 0.40;
            }
          } else {
            // High title match without year to disambiguate
            confidence = 0.78;
            reason = "title_fuzzy";
          }
        } else if (titleSim >= 0.80) {
          if (targetYear && candidateYear && Math.abs(targetYear - candidateYear) <= 1) {
            confidence = 0.75;
            reason = "title_and_year";
          } else {
            confidence = 0.50;
          }
        }

        if (confidence > highestConfidence && confidence >= 0.65) {
          highestConfidence = confidence;
          bestMatch = {
            show: candidateShow,
            confidence,
            matchReason: reason,
          };
        }
      }

      if (bestMatch) {
        return bestMatch;
      }
    }
  }

  // Stage 5: No confident match found
  return null;
}
