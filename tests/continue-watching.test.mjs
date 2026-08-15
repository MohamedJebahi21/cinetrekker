import test from "node:test";
import assert from "node:assert/strict";

import { getNextEpisode } from "../src/lib/continueWatching/nextEpisode.ts";
import { getReleasedProgressPercent } from "../src/lib/continueWatching/progressDisplay.ts";
import {
  getPublishedEpisodeTotal,
  isDefinitelyCompleted,
  isShowDefinitelyCompleted,
  getShowsToMarkCompleted,
  getShowsToReopen,
} from "../src/lib/continueWatching/progress.ts";

const PAST = new Date("2020-01-01").getTime();
const FUTURE = new Date("2099-01-01").getTime();

test("getNextEpisode finds first unwatched episode in current season", () => {
  const result = getNextEpisode({
    lastWatched: { season: 1, episode: 1 },
    watchedSet: new Set(["1-1"]),
    seasons: [{ season_number: 1, episode_count: 3, air_date: "2019-01-01" }],
    episodesBySeason: {
      1: [
        { season_number: 1, episode_number: 1, air_date: "2019-01-01", name: "Pilot" },
        { season_number: 1, episode_number: 2, air_date: "2019-01-08", name: "Two" },
      ],
    },
    details: {},
    now: PAST,
  });

  assert.equal(result?.episode.episode_number, 2);
  assert.equal(result?.isUpcoming, false);
});

test("getNextEpisode transitions to next season when current season is complete", () => {
  const result = getNextEpisode({
    lastWatched: { season: 1, episode: 2 },
    watchedSet: new Set(["1-1", "1-2"]),
    seasons: [
      { season_number: 1, episode_count: 2, air_date: "2019-01-01" },
      { season_number: 2, episode_count: 2, air_date: "2019-06-01" },
    ],
    episodesBySeason: {
      1: [
        { season_number: 1, episode_number: 1, air_date: "2019-01-01" },
        { season_number: 1, episode_number: 2, air_date: "2019-01-08" },
      ],
      2: [
        { season_number: 2, episode_number: 1, air_date: "2019-06-01", name: "S2E1" },
      ],
    },
    details: {},
    now: PAST,
  });

  assert.equal(result?.episode.season_number, 2);
  assert.equal(result?.episode.episode_number, 1);
  assert.equal(result?.episode.name, "S2E1");
});

test("getPublishedEpisodeTotal respects last_episode_to_air for airing seasons", () => {
  const total = getPublishedEpisodeTotal({
    number_of_episodes: 20,
    seasons: [
      { season_number: 1, episode_count: 10, air_date: "2019-01-01" },
      { season_number: 2, episode_count: 10, air_date: "2020-01-01" },
    ],
    last_episode_to_air: {
      season_number: 2,
      episode_number: 3,
      air_date: "2020-03-01",
    },
  }, new Date("2020-06-01").getTime());

  assert.equal(total, 13);
});

test("isDefinitelyCompleted returns false when total is unknown", () => {
  assert.equal(
    isDefinitelyCompleted({ watchedEpisodesCount: 10, totalEpisodes: null }),
    false,
  );
});

test("isShowDefinitelyCompleted returns true when counts match", () => {
  assert.equal(
    isShowDefinitelyCompleted({
      showId: 1,
      showName: "Test",
      posterPath: null,
      status: "watching",
      watchedEpisodes: new Set(),
      lastWatchedEpisode: null,
      lastActivityAt: "2020-01-01",
      isFollowed: true,
      watchedEpisodeCount: 10,
      totalEpisodes: 10,
      totalSeasons: 1,
    }),
    true,
  );
});

test("getNextEpisode skips unreleased episodes", () => {
  const result = getNextEpisode({
    lastWatched: null,
    watchedSet: new Set(),
    seasons: [{ season_number: 1, episode_count: 2, air_date: "2019-01-01" }],
    episodesBySeason: {
      1: [
        { season_number: 1, episode_number: 1, air_date: "2099-01-01" },
        { season_number: 1, episode_number: 2, air_date: "2019-01-08", name: "Released" },
      ],
    },
    details: {},
    now: PAST,
  });

  assert.equal(result?.episode.episode_number, 2);
});

test("getShowsToMarkCompleted finds shows ready to complete", () => {
  const completed = getShowsToMarkCompleted(
    [
      {
        showId: 1,
        showName: "Test",
        posterPath: null,
        status: "watching",
        watchedEpisodes: new Set(),
        lastWatchedEpisode: null,
        lastActivityAt: "2020-01-01",
        isFollowed: true,
        watchedEpisodeCount: 10,
        totalEpisodes: 10,
        totalSeasons: 1,
      },
    ],
    new Set(),
  );

  assert.deepEqual(completed, [1]);
});

test("Continue Watching does not invent progress before a release-aware total is available", () => {
  assert.equal(getReleasedProgressPercent(5, null), null);
});

test("Continue Watching percentage uses the verified released total", () => {
  assert.equal(getReleasedProgressPercent(5, 11), 45);
});

test("getShowsToReopen finds completed shows with new episodes", () => {
  const reopen = getShowsToReopen(
    [
      {
        showId: 2,
        showName: "Test",
        posterPath: null,
        status: "completed",
        watchedEpisodes: new Set(),
        lastWatchedEpisode: null,
        lastActivityAt: "2020-01-01",
        isFollowed: true,
        watchedEpisodeCount: 10,
        totalEpisodes: 12,
        totalSeasons: 2,
      },
    ],
    new Set([2]),
  );

  assert.deepEqual(reopen, [2]);
});
