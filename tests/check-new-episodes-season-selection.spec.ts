import { expect, test } from "@playwright/test";
import { getCandidateSeasons } from "../supabase/functions/check-new-episodes/seasonSelection";

test.describe("check-new-episodes season selection", () => {
  test("includes prior season when TMDB has a newer shell season", () => {
    const seasons = getCandidateSeasons({
      number_of_seasons: 6,
      last_episode_to_air: { season_number: 5 },
    });

    // Critical multi-season path:
    // when season 6 exists but latest aired episode is still season 5,
    // we must scan both 6 and 5 to avoid missing recent episodes.
    expect(seasons).toEqual([6, 5, 4]);
  });

  test("deduplicates and keeps only valid positive season numbers", () => {
    const seasons = getCandidateSeasons({
      number_of_seasons: 1,
      last_episode_to_air: { season_number: 1 },
    });

    expect(seasons).toEqual([1]);
  });
});
