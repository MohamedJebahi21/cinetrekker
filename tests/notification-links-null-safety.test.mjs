import assert from "node:assert/strict";
import test from "node:test";
import {
  getNotificationTarget,
  parseNotificationTarget,
} from "../src/lib/notificationLinks.ts";

test("notification target parsing accepts valid media identifiers", () => {
  assert.deepEqual(parseNotificationTarget("movie-42"), {
    mediaType: "movie",
    mediaId: 42,
    path: "/movie/42",
  });
  assert.equal(getNotificationTarget("tv-7"), "/tv/7");
});

test("notification target parsing safely ignores malformed or missing legacy identifiers", () => {
  for (const target of [null, undefined, "", "movie", "invalid-42", "tv-unknown"]) {
    assert.equal(parseNotificationTarget(target), null);
    assert.equal(getNotificationTarget(target), null);
  }
});
