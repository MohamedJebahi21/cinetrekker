import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/hooks/useFollowedShows.ts", import.meta.url),
  "utf8",
);

test("Continue Watching loads every persisted watched-episode page instead of the PostgREST default page", () => {
  assert.match(source, /const WATCHED_EPISODES_PAGE_SIZE = 500/);
  assert.match(source, /async function fetchAllWatchedEpisodes\(userId: string\)/);
  assert.match(source, /while \(true\)/);
  assert.match(source, /\.range\(offset, offset \+ WATCHED_EPISODES_PAGE_SIZE - 1\)/);
  assert.match(source, /if \(page\.length < WATCHED_EPISODES_PAGE_SIZE\) break/);
  assert.match(source, /offset \+= WATCHED_EPISODES_PAGE_SIZE/);
  assert.match(source, /return fetchAllWatchedEpisodes\(user\.id\)/);
});

test("Continue Watching de-duplicates an episode that changes pages during a concurrent update", () => {
  assert.match(source, /new Map\(/);
  assert.match(source, /\$\{episode\.show_id\}-\$\{episode\.season_number\}-\$\{episode\.episode_number\}/);
});
