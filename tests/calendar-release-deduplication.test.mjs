import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/pages/Calendar.tsx", import.meta.url), "utf8");

test("Calendar deduplicates exact scheduled releases before deriving desktop planning views", () => {
  assert.match(source, /function getCalendarItemKey\(item: CalendarItem\)/);
  assert.match(source, /item\.date\.split\('T'\)\[0\]/);
  assert.match(source, /item\.seasonNumber \?\? ''/);
  assert.match(source, /item\.episodeNumber \?\? ''/);
  assert.match(source, /function deduplicateCalendarItems\(items: CalendarItem\[\]\)/);
  assert.match(source, /\(!existing \|\| \(!existing\.isFollowed && item\.isFollowed\)\)/);
  assert.match(source, /return deduplicateCalendarItems\(items\);/);
});


test("Calendar communicates release-data freshness and uses one contextual save action", () => {
  assert.match(source, /dataUpdatedAt: moviesUpdatedAt/);
  assert.match(source, /dataUpdatedAt: tvUpdatedAt/);
  assert.match(source, /calendarTimeZone/);
  assert.match(source, /calendar\.dataFreshness/);
  assert.match(source, /function|const handleCalendarSaveToggle/);
  assert.match(source, /calendar\.removeFromPlan/);
  assert.match(source, /calendar\.addToWatchlist/);
  assert.match(source, /calendar\.followShow/);
});
