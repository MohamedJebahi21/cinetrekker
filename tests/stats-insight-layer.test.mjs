import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/pages/EnhancedStats.tsx"),
  "utf8",
);

test("Statistics front-loads a personal insight, methodology, and history action", () => {
  assert.match(source, /filteredTitleCount/);
  assert.match(source, /leadingGenre/);
  assert.match(source, /stats\.insightWithGenre/);
  assert.match(source, /stats\.insightWithoutGenre/);
  assert.match(source, /stats\.methodologyCopy/);
  assert.match(source, /setActiveTab\("history"\)/);
  assert.match(source, /stats\.reviewFilteredHistory/);
});
