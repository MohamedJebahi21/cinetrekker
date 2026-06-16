/**
 * Ranking Engine — pure function.
 *
 * Scores shows by engagement + recency + follow status,
 * producing a Netflix-like "Continue Watching" order.
 *
 * No TMDB data required. Works entirely on UserShowProgress.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ RANKING SAFETY RULES (anti-drift)                                       │
 * │                                                                        │
 * │ Completion filtering uses ONLY !isShowDefinitelyCompleted(s).           │
 * │                                                                        │
 * │ FORBIDDEN in this file:                                                 │
 * │   - status string comparisons (status === "completed")                  │
 * │   - watchedEpisodesCount >= totalEpisodes logic                         │
 * │   - TMDB-derived metadata for scoring or filtering                      │
 * │   - viewModel fields for any logic decision                             │
 * │                                                                        │
 * │ ALLOWED in this file:                                                   │
 * │   - isShowDefinitelyCompleted() from progress.ts (the ONLY authority)   │
 * │   - watchedEpisodeCount, lastActivityAt, isFollowed (raw progress)      │
 * │                                                                        │
 * │ If someone adds a status comparison here in the future,                │
 * │ it is a BUG — reject in code review.                                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import type { UserShowProgress } from "@/types/continueWatching";
import { isShowDefinitelyCompleted } from "./progress";

export interface RankingOptions {
  /** Bonus points for followed (vs just watched) shows. */
  followBonus?: number;
  /** Half-life in days for recency decay. */
  halfLifeDays?: number;
  /** Max shows to return. */
  limit?: number;
  /** Weight per watched episode. */
  engagementWeight?: number;
}

const DEFAULTS: Required<RankingOptions> = {
  followBonus: 15,
  halfLifeDays: 7,
  limit: 50,
  engagementWeight: 10,
};

/**
 * Exponential recency decay.
 * A show touched today → weight = 100.
 * A show touched halfLifeDays ago → weight = 50.
 * A show touched 2*halfLifeDays ago → weight = 25.
 */
function recencyWeight(
  lastActivityAt: string,
  halfLifeDays: number,
  nowMs: number,
): number {
  const ageMs = nowMs - new Date(lastActivityAt).getTime();
  if (ageMs <= 0) return 100;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, ageDays / halfLifeDays) * 100;
}

/**
 * Score a single show.
 *
 * score = (watchedEpisodes * engagementWeight) + recencyDecay + followBonus
 *
 * This means:
 * - A show with 20 watched episodes gets 200 + recency + 15 = ~315
 * - A show with 2 watched episodes gets 20 + recency + 15 = ~135
 * - A followed show with 0 episodes gets 0 + 0 + 15 = 15
 */
export function scoreShow(
  show: UserShowProgress,
  options: Required<RankingOptions>,
  nowMs: number,
): number {
  const engagement = show.watchedEpisodeCount * options.engagementWeight;
  const recency = recencyWeight(show.lastActivityAt, options.halfLifeDays, nowMs);
  const follow = show.isFollowed ? options.followBonus : 0;
  return engagement + recency + follow;
}

/**
 * Rank all shows by descending score, filtered and limited.
 *
 * SAFETY: The filter MUST use isShowDefinitelyCompleted(s).
 * DO NOT change to: s.status !== "completed" — that is a bug.
 * Status is a display label, not a logic decision.
 */
export function rankShows(
  shows: UserShowProgress[],
  options: RankingOptions = {},
): UserShowProgress[] {
  const opts = { ...DEFAULTS, ...options };
  const nowMs = Date.now();

  return [...shows]
    .filter((s) => !isShowDefinitelyCompleted(s))
    .map((s) => ({
      show: s,
      score: scoreShow(s, opts, nowMs),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit)
    .map(({ show }) => show);
}