import test from "node:test";
import assert from "node:assert/strict";
import {
  extractBroadcastSchedule,
  extractNextOrPrevEpisode,
  normalizeTVmazeShow,
} from "../api/_lib/metadata/providers/tvmaze.ts";

test("extractBroadcastSchedule extracts network, timezone, and days accurately", () => {
  const show = {
    id: 1,
    url: "https://www.tvmaze.com/shows/1/under-the-dome",
    name: "Under the Dome",
    type: "Scripted",
    language: "English",
    genres: ["Drama", "Science-Fiction"],
    status: "Ended",
    schedule: {
      time: "22:00",
      days: ["Thursday"],
    },
    network: {
      id: 2,
      name: "CBS",
      country: { name: "United States", code: "US", timezone: "America/New_York" },
    },
    webChannel: null,
  };

  const schedule = extractBroadcastSchedule(show);
  assert.equal(schedule.network, "CBS");
  assert.equal(schedule.networkCountry, "United States");
  assert.equal(schedule.webChannel, null);
  assert.deepEqual(schedule.days, ["Thursday"]);
  assert.equal(schedule.time, "22:00");
  assert.equal(schedule.timezone, "America/New_York");
});

test("extractBroadcastSchedule supports webChannel platforms when network is null", () => {
  const show = {
    id: 2,
    url: "https://www.tvmaze.com/shows/2/stranger-things",
    name: "Stranger Things",
    type: "Scripted",
    language: "English",
    genres: ["Drama", "Fantasy", "Science-Fiction"],
    status: "Running",
    schedule: { time: "", days: [] },
    network: null,
    webChannel: {
      id: 1,
      name: "Netflix",
      country: null,
    },
  };

  const schedule = extractBroadcastSchedule(show);
  assert.equal(schedule.network, null);
  assert.equal(schedule.webChannel, "Netflix");
  assert.deepEqual(schedule.days, []);
  assert.equal(schedule.time, null);
});

test("extractNextOrPrevEpisode sanitizes summary HTML and parses airtime", () => {
  const rawEpisode = {
    id: 185054,
    url: "https://www.tvmaze.com/episodes/185054",
    name: "Chapter One: The Vanishing of Will Byers",
    season: 1,
    number: 1,
    airdate: "2016-07-15",
    airtime: "03:00",
    summary: "<p>On his way home from a friend&#39;s house, young Will sees something terrifying.</p>",
  };

  const extracted = extractNextOrPrevEpisode(rawEpisode);
  assert.ok(extracted);
  assert.equal(extracted.id, 185054);
  assert.equal(extracted.name, "Chapter One: The Vanishing of Will Byers");
  assert.equal(extracted.season, 1);
  assert.equal(extracted.number, 1);
  assert.equal(extracted.airdate, "2016-07-15");
  assert.equal(extracted.airtime, "03:00");
  assert.equal(extracted.summary, "On his way home from a friend's house, young Will sees something terrifying.");
});

test("extractNextOrPrevEpisode returns null if episode is missing or incomplete", () => {
  assert.equal(extractNextOrPrevEpisode(null), null);
  assert.equal(extractNextOrPrevEpisode(undefined), null);
  assert.equal(extractNextOrPrevEpisode({ name: "", airdate: "2024-01-01" }), null);
  assert.equal(extractNextOrPrevEpisode({ name: "Ep 1", airdate: "" }), null);
});

test("normalizeTVmazeShow correctly organizes seasons, specials, and external IDs", () => {
  const show = {
    id: 169,
    url: "https://www.tvmaze.com/shows/169/breaking-bad",
    name: "Breaking Bad",
    type: "Scripted",
    language: "English",
    genres: ["Drama", "Crime", "Thriller"],
    status: "Ended",
    premiered: "2008-01-20",
    summary: "<p>A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing methamphetamine.</p>",
    externals: {
      tvrage: 18164,
      thetvdb: 81189,
      imdb: "tt0903747",
    },
    image: {
      medium: "https://static.tvmaze.com/uploads/images/medium_portrait/0/2400.jpg",
      original: "https://static.tvmaze.com/uploads/images/original_untouched/0/2400.jpg",
    },
    _embedded: {
      seasons: [
        {
          id: 620,
          url: "https://www.tvmaze.com/seasons/620",
          number: 1,
          name: "Season 1",
          premiereDate: "2008-01-20",
          summary: "<p>First season overview</p>",
        },
      ],
      episodes: [
        {
          id: 12214,
          url: "https://www.tvmaze.com/episodes/12214",
          name: "Pilot",
          season: 1,
          number: 1,
          airdate: "2008-01-20",
          airtime: "22:00",
          runtime: 58,
          rating: { average: 8.8 },
          summary: "<p>The pilot episode.</p>",
        },
        {
          id: 99999,
          url: "https://www.tvmaze.com/episodes/99999",
          name: "Original Minisodes",
          season: 0,
          number: null,
          airdate: "2009-02-17",
          airtime: "",
          runtime: 5,
          rating: { average: 7.2 },
          summary: "<p>Special minisode.</p>",
        },
      ],
    },
  };

  const normalized = normalizeTVmazeShow(show);
  assert.equal(normalized.id, 169);
  assert.equal(normalized.title, "Breaking Bad");
  assert.equal(normalized.mediaType, "tv");
  assert.equal(normalized.status, "Ended");
  assert.equal(normalized.releaseDate, "2008-01-20");
  assert.equal(normalized.externalIds.imdbId, "tt0903747");
  assert.equal(normalized.externalIds.tvdbId, 81189);
  assert.equal(normalized.externalIds.tvmazeId, 169);
  assert.equal(normalized.totalSeasons, 1);
  assert.equal(normalized.totalEpisodes, 2);

  // Check seasons
  assert.equal(normalized.seasons.length, 1);
  assert.equal(normalized.seasons[0].seasonNumber, 1);
  assert.equal(normalized.seasons[0].overview, "First season overview");
  assert.equal(normalized.seasons[0].episodes.length, 1);
  assert.equal(normalized.seasons[0].episodes[0].name, "Pilot");
  assert.equal(normalized.seasons[0].episodes[0].isSpecial, false);
  assert.equal(normalized.seasons[0].episodes[0].airTime, "22:00");

  // Check specials
  assert.equal(normalized.specials.length, 1);
  assert.equal(normalized.specials[0].name, "Original Minisodes");
  assert.equal(normalized.specials[0].isSpecial, true);
  assert.equal(normalized.specials[0].seasonNumber, 0);
  assert.equal(normalized.specials[0].episodeNumber, 0);
});

test("normalizeTVmazeShow handles missing _embedded data gracefully", () => {
  const show = {
    id: 999,
    url: "https://www.tvmaze.com/shows/999",
    name: "Minimal Show",
    type: "Scripted",
    language: "English",
    genres: [],
    status: "In Development",
  };

  const normalized = normalizeTVmazeShow(show);
  assert.equal(normalized.id, 999);
  assert.equal(normalized.title, "Minimal Show");
  assert.equal(normalized.totalSeasons, 0);
  assert.equal(normalized.totalEpisodes, 0);
  assert.deepEqual(normalized.seasons, []);
  assert.deepEqual(normalized.specials, []);
  assert.equal(normalized.nextEpisode, null);
  assert.equal(normalized.previousEpisode, null);
});
