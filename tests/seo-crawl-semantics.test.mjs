import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("public trust guidance is indexable while unknown routes render crawler-safe noindex metadata", () => {
  const sitemap = read("api/sitemap.js");
  const app = read("src/AppRoutes.tsx");
  const fallback = read("src/pages/TitleStatus.tsx");

  assert.match(sitemap, /\{ path: "\/trust", changefreq: "monthly", priority: "0\.4" \}/);
  assert.match(sitemap, /\{ path: "\/measurement", changefreq: "monthly", priority: "0\.3" \}/);
  assert.match(sitemap, /\{ path: "\/partnerships", changefreq: "monthly", priority: "0\.3" \}/);
  assert.match(sitemap, /"\/trust": "2026-08-24"/);
  assert.match(sitemap, /"\/measurement": "2026-08-24"/);
  assert.match(sitemap, /"\/partnerships": "2026-08-24"/);
  assert.match(app, /path="\/trust"/);
  assert.match(fallback, /robots="noindex,follow"/);
  assert.match(fallback, /normaliz(ed|e)LegacyPath/);
});
