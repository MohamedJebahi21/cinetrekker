import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homeDataPath = new URL("../src/hooks/useHomePageData.ts", import.meta.url);
const homePagePath = new URL("../src/pages/Index.tsx", import.meta.url);

test("Home defers non-selected discovery requests and reuses the hero weekly query", async () => {
  const [homeDataSource, homePageSource] = await Promise.all([
    readFile(homeDataPath, "utf8"),
    readFile(homePagePath, "utf8"),
  ]);

  assert.doesNotMatch(homeDataSource, /criticalDataQuery/);
  assert.match(homeDataSource, /queryKey: \["hero-top-weekly", language, includeAdult\]/);
  assert.match(
    homeDataSource,
    /enabled: deferredEnabled && discoverTab === "trending-week"/,
  );
  assert.match(
    homeDataSource,
    /enabled: deferredEnabled && discoverTab === "new-releases"/,
  );
  assert.match(
    homeDataSource,
    /enabled: deferredEnabled && discoverTab === "trending-day"/,
  );
  assert.match(homeDataSource, /const activeDiscoveryQuery =/);

  assert.match(homePageSource, /loading=\{!deferredEnabled \|\| activeDiscoveryQuery\.isLoading\}/);
  assert.match(homePageSource, /void activeDiscoveryQuery\.refetch\(\)/);
  assert.match(homePageSource, /items=\{trendingWeekQuery\.data\?\.results \|\| \[\]\}/);
  assert.match(homePageSource, /items=\{newReleasesQuery\.data\?\.results \|\| \[\]\}/);
});
