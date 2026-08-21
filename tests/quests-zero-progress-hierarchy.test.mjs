import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../src/pages/Quests.tsx", import.meta.url), "utf8");
const hubSource = await readFile(
  new URL("../src/components/quests/CineQuestHub.tsx", import.meta.url),
  "utf8",
);
const cardSource = await readFile(
  new URL("../src/components/quests/CineQuestCard.tsx", import.meta.url),
  "utf8",
);

test("Quests enables the starter experience only on the full mission-board route", () => {
  assert.match(pageSource, /<CineQuestHub showStarterExperience \/>/);
  assert.match(hubSource, /showStarterExperience = false/);
  assert.match(hubSource, /const \{ watched, watchlist, loading: userListsLoading \} = useUserLists\(\)/);
  assert.match(
    hubSource,
    /showStarterExperience &&\s*!userListsLoading &&\s*watched\.length === 0 &&\s*watchlist\.length === 0 &&\s*completedCount === 0/,
  );
});

test("Quests prioritizes starter missions and one discovery action before the full board", () => {
  assert.match(hubSource, /const displayedQuests = isStarterPreview \? quests\.slice\(0, 3\) : visibleQuests/);
  assert.match(hubSource, /<Link\s+to="\/discover"/);
  assert.match(hubSource, /t\("watched\.discoverTitles", "Discover titles"\)/);
  assert.match(hubSource, /setShowFullBoard\(true\)/);
  assert.match(hubSource, /<CineQuestCard key=\{quest\.id\} quest=\{quest\} showAction=\{!isStarterPreview\} \/>/);
});

test("Quest cards retain normal activity links outside the starter preview", () => {
  assert.match(cardSource, /showAction = true/);
  assert.match(cardSource, /\{showAction \? \(/);
  assert.match(cardSource, /<Link to="\/watched"/);
});
