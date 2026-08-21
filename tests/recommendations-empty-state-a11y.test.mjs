import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/pages/Recommendations.tsx", import.meta.url), "utf8");

test("Recommendations empty-state discovery action is a single accessible button-styled link", () => {
  assert.match(source, /<Button asChild className="gap-2 rounded-full px-6">\s*<Link to="\/search">/s);
  assert.match(source, /common\.discoverTrending", "Discover Trending"/);
  assert.doesNotMatch(source, /<Link to="\/search">\s*<Button className="gap-2 rounded-full px-6">/s);
});
