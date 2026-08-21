import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/pages/YearInReview.tsx", import.meta.url), "utf8");

test("Year in Review empty state guides users to discover titles without mutating viewing data", () => {
  assert.match(source, /Start watching in \{\{year\}\} to see your Year in Review!/);
  assert.match(source, /<Button asChild className="min-h-11 rounded-xl px-5 font-semibold">/);
  assert.match(source, /<Link to="\/discover">/);
  assert.match(source, /yearInReview\.discoverTitles", "Discover titles"/);
});
