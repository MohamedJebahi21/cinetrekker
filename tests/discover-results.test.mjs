import test from "node:test";
import assert from "node:assert/strict";

import {
  combineDiscoverResponses,
  tagDiscoverResponse,
} from "../src/lib/discoverResults.ts";

function mediaFixture(id, title) {
  return {
    id,
    title,
    overview: `${title} overview`,
    poster_path: null,
    backdrop_path: null,
    vote_average: 7.5,
    vote_count: 100,
    popularity: 42,
  };
}

function response(results, totalPages = 1) {
  return {
    page: 1,
    total_pages: totalPages,
    total_results: results.length,
    results,
  };
}

test("normalizes a movie-only discover response with a movie discriminator", () => {
  const normalized = combineDiscoverResponses(2, [
    tagDiscoverResponse(response([mediaFixture(1, "Movie")], 4), "movie"),
  ]);

  assert.equal(normalized.page, 2);
  assert.equal(normalized.total_pages, 4);
  assert.deepEqual(
    normalized.results.map((item) => [item.id, item.media_type]),
    [[1, "movie"]],
  );
});

test("normalizes a TV-only discover response with a TV discriminator", () => {
  const normalized = combineDiscoverResponses(3, [
    tagDiscoverResponse(response([mediaFixture(2, "Show")], 7), "tv"),
  ]);

  assert.equal(normalized.page, 3);
  assert.equal(normalized.total_pages, 7);
  assert.deepEqual(
    normalized.results.map((item) => [item.id, item.media_type]),
    [[2, "tv"]],
  );
});

test("combines mixed discover responses without erasing their media discriminators", () => {
  const normalized = combineDiscoverResponses(1, [
    tagDiscoverResponse(response([mediaFixture(10, "Film")], 2), "movie"),
    tagDiscoverResponse(
      response([mediaFixture(20, "Series"), mediaFixture(21, "Another Series")], 5),
      "tv",
    ),
  ]);

  assert.equal(normalized.total_pages, 5);
  assert.deepEqual(
    normalized.results.map((item) => [item.id, item.media_type]),
    [
      [10, "movie"],
      [20, "tv"],
      [21, "tv"],
    ],
  );
});
