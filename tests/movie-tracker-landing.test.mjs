import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
const readProjectFile = (path) => readFile(new URL(path, root), "utf8");

test("movie tracker landing page is routed, indexable, and conversion-ready", async () => {
  const [page, app, sitemap, vercelConfig, edgeMeta] = await Promise.all([
    readProjectFile("src/pages/MovieTracker.tsx"),
    readProjectFile("src/App.tsx"),
    readProjectFile("api/sitemap.js"),
    readProjectFile("vercel.json"),
    readProjectFile("api/edge-meta.js"),
  ]);

  assert.match(page, /Free Movie & TV Show Tracker/);
  assert.match(page, /to="\/search"/);
  assert.match(page, /to="\/signup"/);
  assert.match(page, /toFaqJsonLd\(faqItems\)/);
  assert.match(app, /path="\/movie-tracker"/);
  assert.match(sitemap, /path: "\/movie-tracker"/);
  assert.match(vercelConfig, /"source": "\/movie-tracker"/);
  assert.match(edgeMeta, /function buildMovieTrackerMeta\(\)/);
  assert.match(edgeMeta, /pathname === "\/movie-tracker"/);
});
