import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("homepage metadata presents CineTrekker as the concise public title", async () => {
  const [metadata, indexPage, html, manifest, edgeMeta] = await Promise.all([
    read("src/lib/metadata.ts"),
    read("src/pages/Index.tsx"),
    read("index.html"),
    read("public/manifest.webmanifest"),
    read("api/edge-meta.js"),
  ]);

  assert.match(metadata, /title: "CineTrekker"/);
  assert.match(metadata, /openGraph:[\s\S]*?title: "CineTrekker"/);
  assert.match(metadata, /twitter:[\s\S]*?title: "CineTrekker"/);
  assert.doesNotMatch(metadata, /Movie & TV Show Tracker — Watchlist and Progress/);

  assert.match(indexPage, /<SEO[\s\S]*?title="CineTrekker"/);
  assert.match(html, /<title>CineTrekker<\/title>/);
  assert.match(html, /property="og:title" content="CineTrekker"/);
  assert.match(html, /name="twitter:title"[\s\S]*?content="CineTrekker"/);
  assert.doesNotMatch(html, /Movie &amp; TV Show Tracker — Watchlist and Progress \| CineTrekker/);

  assert.match(manifest, /"name": "CineTrekker"/);
  assert.doesNotMatch(manifest, /Movie & TV Tracker/);
  assert.match(edgeMeta, /<title>CineTrekker<\/title>/);
});
