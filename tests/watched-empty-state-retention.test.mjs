import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/pages/Watched.tsx", import.meta.url), "utf8");

test("Watched empty state guides returning users to discover titles without mutating history", () => {
  assert.match(source, /Mark movies and shows as watched to build your history/);
  assert.match(source, /<Button asChild className="mt-6 min-h-11 rounded-xl px-5 font-semibold">/);
  assert.match(source, /<Link to="\/discover">/);
  assert.match(source, /watched\.discoverTitles", "Discover titles"/);
});
