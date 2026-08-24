import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/pages/Profile.tsx"),
  "utf8",
);

test("favorite removal requires a deliberate confirmation step", () => {
  assert.match(source, /pendingFavoriteRemoval/);
  assert.match(source, /requestFavoriteRemoval/);
  assert.match(source, /confirmFavoriteRemovalTitle/);
  assert.match(source, /unpinFavorite\(\s*pendingFavoriteRemoval\.mediaId/);
});

test("Taste & Stats explains its methodology and provides a history action", () => {
  assert.match(source, /tasteMethodTitle/);
  assert.match(source, /tasteMethodCopy/);
  assert.match(source, /to="\/watched"/);
  assert.match(source, /reviewHistory/);
});
