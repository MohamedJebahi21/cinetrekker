import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/pages/Achievements.tsx", import.meta.url), "utf8");

test("Achievements identifies a true zero-progress account before showing the starter experience", () => {
  assert.match(source, /const \{ watched, loading: userListsLoading \} = useUserLists\(\)/);
  assert.match(
    source,
    /const isStarterState =\s*!userListsLoading &&\s*uniqueWatchedEntries\.length === 0 &&\s*unlockedAchievements === 0/,
  );
  assert.match(source, /const \[showFullRoadmap, setShowFullRoadmap\] = useState\(false\)/);
});

test("Achievements prioritizes three starter milestones with discovery and explicit roadmap access", () => {
  assert.match(source, /\["watch-first", "rate-first", "genre-5"\]\.includes\(item\.id\)/);
  assert.match(source, /isStarterState && !showFullRoadmap\s*\? starterAchievements\s*: filteredAchievements/);
  assert.match(source, /<Link to="\/discover">/);
  assert.match(source, /t\("watched\.discoverTitles", "Discover titles"\)/);
  assert.match(source, /setShowFullRoadmap\(true\)/);
  assert.match(source, /t\("achievements\.viewRoadmap", "View full roadmap"\)/);
});

test("Achievements retains filters and the full grid after progress begins or the roadmap is requested", () => {
  assert.match(source, /!isStarterState \|\| showFullRoadmap \? \(/);
  assert.match(source, /<Input\s+[\s\S]*placeholder="Search achievements\.\.\."/);
  assert.match(source, /\{displayedAchievements\.map\(\(item, idx\) => \{/);
});
