import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/pages/Profile.tsx"),
  "utf8",
);
const tasteBreakdownSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/profile/ProfileTasteBreakdown.tsx"),
  "utf8",
);

test("favorite removal requires a deliberate confirmation step", () => {
  assert.match(source, /pendingFavoriteRemoval/);
  assert.match(source, /requestFavoriteRemoval/);
  assert.match(source, /confirmFavoriteRemovalTitle/);
  assert.match(source, /unpinFavorite\(\s*pendingFavoriteRemoval\.mediaId/);
});

test("Taste & Stats explains its methodology and provides a history action", () => {
  assert.match(tasteBreakdownSource, /tasteMethodTitle/);
  assert.match(tasteBreakdownSource, /tasteMethodCopy/);
  assert.match(tasteBreakdownSource, /to="\/watched"/);
  assert.match(tasteBreakdownSource, /reviewHistory/);
});
