import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Quests inherits one shared navigation from the application shell", async () => {
  const [quests, app] = await Promise.all([
    readSource("src/pages/Quests.tsx"),
    readSource("src/App.tsx"),
  ]);

  assert.doesNotMatch(quests, /import \{ UnifiedNav \} from "@\/components\/UnifiedNav";/);
  assert.doesNotMatch(quests, /<UnifiedNav\s*\/>/);
  assert.match(quests, /<CineQuestHub(?:\s+showStarterExperience)?\s*\/>/);
  assert.match(app, /<UnifiedNav\s*\/>/);
});
