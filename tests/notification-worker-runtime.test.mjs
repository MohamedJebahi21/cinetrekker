import test from "node:test";
import assert from "node:assert/strict";
import { __testables } from "../api/jobs/check-followed-updates.js";

const {
  parseMovieKey,
  getExpiryIso,
  createChangeEvents,
  computeNextCursor,
  isAuthorizedCronCall,
  NOTIFICATION_RETENTION_DAYS,
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_SIZE,
} = __testables;

test("notification worker accepts only deterministic TMDB title keys", () => {
  assert.deepEqual(parseMovieKey("movie-42"), { movieKey: "movie-42", mediaType: "movie", tmdbId: 42 });
  assert.deepEqual(parseMovieKey("TV-51"), { movieKey: "TV-51", mediaType: "tv", tmdbId: 51 });
  assert.equal(parseMovieKey("42"), null);
  assert.equal(parseMovieKey("movie-x"), null);
  assert.equal(parseMovieKey("series-42"), null);
});

test("notification expiry remains fixed at the declared retention window", () => {
  const start = Date.UTC(2026, 7, 24, 12, 0, 0);
  const expiry = new Date(getExpiryIso(start)).getTime();
  assert.equal(expiry - start, NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  assert.equal(DEFAULT_BATCH_SIZE, 12);
  assert.equal(MAX_BATCH_SIZE, 50);
});

test("change events are deterministic and idempotency-keyed by title state", () => {
  const previous = {
    release_date: "2026-08-01",
    status: "Returning Series",
    number_of_seasons: 2,
    last_episode_season_number: 2,
    last_episode_number: 4,
  };
  const next = {
    movie_id: "tv-99",
    media_type: "tv",
    release_date: "2026-09-01",
    status: "Ended",
    number_of_seasons: 3,
    last_episode_season_number: 3,
    last_episode_number: 1,
  };

  const events = createChangeEvents(previous, next, "Example");
  assert.deepEqual(events.map((event) => event.type), [
    "release_date_changed",
    "status_changed",
    "new_season",
    "new_episode",
  ]);
  assert.deepEqual(events.map((event) => event.eventKey), [
    "tv-99:release_date:2026-09-01",
    "tv-99:status:ended",
    "tv-99:season:3",
    "tv-99:episode:3-1",
  ]);
  assert.deepEqual(createChangeEvents(next, next, "Example"), []);
});

test("cron auth supports GET Bearer (Vercel Cron) and POST x-cron-secret", () => {
  const prev = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "cron-secret-123";
  try {
    assert.equal(
      isAuthorizedCronCall({ method: "GET", headers: { authorization: "Bearer cron-secret-123" } }),
      true,
    );
    assert.equal(
      isAuthorizedCronCall({ method: "GET", headers: { authorization: "Bearer wrong" } }),
      false,
    );
    assert.equal(
      isAuthorizedCronCall({ method: "POST", headers: { "x-cron-secret": "cron-secret-123" } }),
      true,
    );
  } finally {
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  }
});

test("computeNextCursor advances by processed loop index on deadline and preserves cursor if none processed", () => {
  const parsedTitles = [
    { movieKey: "movie-1" },
    { movieKey: "movie-2" },
    { movieKey: "movie-3" },
    { movieKey: "movie-4" },
  ];
  const movieIds = parsedTitles.map((t) => t.movieKey);

  assert.equal(
    computeNextCursor({
      deadlineReached: true,
      lastProcessedIndex: 1,
      parsedTitles,
      movieIds,
      batchSize: 4,
      previousCursor: "movie-0",
    }),
    "movie-2",
  );

  assert.equal(
    computeNextCursor({
      deadlineReached: true,
      lastProcessedIndex: -1,
      parsedTitles,
      movieIds,
      batchSize: 4,
      previousCursor: "movie-0",
    }),
    "movie-0",
  );

  assert.equal(
    computeNextCursor({
      deadlineReached: false,
      lastProcessedIndex: 3,
      parsedTitles,
      movieIds,
      batchSize: 4,
      previousCursor: "movie-0",
    }),
    "movie-4",
  );

  assert.equal(
    computeNextCursor({
      deadlineReached: false,
      lastProcessedIndex: 3,
      parsedTitles,
      movieIds,
      batchSize: 12,
      previousCursor: "movie-0",
    }),
    null,
  );
});
