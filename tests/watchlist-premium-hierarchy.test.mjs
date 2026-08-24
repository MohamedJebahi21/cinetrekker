import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/pages/Watchlist.tsx"),
  "utf8",
);

test("watchlist prioritizes one next-watch action without duplicate dashboard metrics", () => {
  assert.match(source, /watchlistPage\.pickTonight/);
  assert.match(source, /watchlistPage\.progressHeadline/);
  assert.doesNotMatch(source, /<WatchlistStats/);
  assert.doesNotMatch(source, /<WatchlistStatsLine/);
});

test("the stale queue nudge is user-dismissible without changing watchlist records", () => {
  assert.match(source, /const \[showStaleNudge, setShowStaleNudge\] = useState\(true\)/);
  assert.match(source, /showStaleNudge && staleQueueKeys\.size > 0/);
  assert.match(source, /setShowStaleNudge\(false\)/);
  assert.doesNotMatch(source, /removeFromWatchlist\([^)]*stale/);
});
