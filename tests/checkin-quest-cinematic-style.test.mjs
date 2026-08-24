import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("daily check-in and monthly quests use CineTrekker's restrained primary surface", async () => {
  const [checkIn, questHub, questCard] = await Promise.all([
    read("src/components/home/DailyCheckInCard.tsx"),
    read("src/components/quests/CineQuestHub.tsx"),
    read("src/components/quests/CineQuestCard.tsx"),
  ]);

  assert.match(checkIn, /border-primary\/20/);
  assert.match(checkIn, /bg-primary/);
  assert.match(checkIn, /bg-primary transition-\[width\]/);
  assert.doesNotMatch(checkIn, /amber-|yellow-|Sparkles|Flame/);

  assert.match(questHub, /border-primary\/20/);
  assert.match(questCard, /border-primary\/20 bg-primary\/10 text-primary/);
  assert.match(questCard, /bg-primary transition-\[width\]/);
  assert.doesNotMatch(questCard, /ACCENT_STYLES|amber-|rose-|violet-|emerald-|yellow-|Sparkles|Trophy|Flame/);
});
