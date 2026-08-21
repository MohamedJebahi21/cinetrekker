import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/components/ContinueWatching.tsx", import.meta.url),
  "utf8",
);

const freshDiscoveryWidthContract =
  "w-[calc(50vw-1.5rem)] shrink-0 snap-start overflow-hidden";
const responsiveRailWidths = "sm:w-[180px] md:w-[200px] lg:w-[220px] xl:w-[240px]";

test("Continue Watching matches the Fresh Discovery desktop rail width contract", () => {
  assert.match(source, new RegExp(freshDiscoveryWidthContract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(source, new RegExp(responsiveRailWidths.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(source, /sm:w-\[390px\]|lg:w-\[420px\]|lg:w-\[460px\]/);
});

test("Continue Watching keeps the Details and Mark Next Episode actions", () => {
  assert.match(source, /t\("common\.details", "Details"\)/);
  assert.match(source, /t\("home\.markNextEpisode", "Mark Next Episode"\)/);
  assert.match(source, /onMarkEpisode\(\{/);
});

test("Continue Watching zero state remains compact and retains its discovery path", () => {
  assert.match(source, /min-h-\[280px\].*md:min-h-\[320px\]/);
  assert.match(source, /h-\[220px\]/);
  assert.match(source, /t\("home\.findShowToStart", "Find a show to start"\)/);
  assert.doesNotMatch(source, /md:min-h-\[460px\]/);
});
