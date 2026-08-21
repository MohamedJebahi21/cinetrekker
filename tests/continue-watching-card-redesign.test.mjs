import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/components/ContinueWatching.tsx", import.meta.url),
  "utf8",
);

const nextEpisodeOccurrences = [...source.matchAll(/t\("home\.nextEpisode"/g)].length;

test("Continue Watching cards present one concise next-episode cue without duplicated status badges", () => {
  assert.equal(nextEpisodeOccurrences, 1);
  assert.doesNotMatch(source, /t\("home\.continueWatchingEyebrow", "In progress"\)/);
  assert.doesNotMatch(source, /bg-gradient-to-br from-background\/85 to-muted\/30/);
  assert.match(source, /border-l-2 border-primary\/70 pl-3/);
  assert.match(source, /aspect-\[3\/2\]/);
});

test("Continue Watching cards retain progress and explicitly labelled resume actions", () => {
  assert.match(source, /home\.seriesProgress/);
  assert.match(source, /h-1\.5 bg-muted\/70/);
  assert.match(source, /t\("common\.details", "Details"\)/);
  assert.match(source, /aria-label=\{t\("home\.markNextEpisode", "Mark Next Episode"\)\}/);
  assert.match(source, /onMarkEpisode\(\{/);
});
