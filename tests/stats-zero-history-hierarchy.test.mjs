import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../src/pages/EnhancedStats.tsx", import.meta.url), "utf8");
const hookSource = await readFile(
  new URL("../src/hooks/useEnhancedStatsData.ts", import.meta.url),
  "utf8",
);

test("Stats separates a true zero-history state from the active analytics workspace", () => {
  assert.match(pageSource, /hasWatchedItems,/);
  assert.match(pageSource, /if \(!hasWatchedItems\) \{/);
  assert.match(pageSource, /<Card className="ct-panel border-primary\/20 bg-primary\/5">/);
  assert.match(pageSource, /<Link to="\/discover">/);
  assert.match(pageSource, /t\("watched\.discoverTitles", "Discover titles"\)/);
  assert.match(pageSource, /<Tabs value=\{activeTab\} onValueChange=\{setActiveTab\}/);
});

test("Stats uses underlying watched-history presence rather than filtered results", () => {
  assert.match(hookSource, /const \{ watched, loading: userListsLoading \} = useUserLists\(\)/);
  assert.match(hookSource, /mediaLoading: userListsLoading \|\| detailsQuery\.isLoading/);
  assert.match(hookSource, /hasWatchedItems: watched\.length > 0/);
});
