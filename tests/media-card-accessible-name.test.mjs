import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/components/MediaCard.tsx", import.meta.url), "utf8");

test("MediaCard detail links do not override their visible accessible name", () => {
  const detailLink = source.match(
    /<Link\s+[\s\S]*?to=\{buildMediaPath\(mediaType, media\.id, title\)\}[\s\S]*?>/,
  )?.[0];

  assert.ok(detailLink, "expected the MediaCard detail Link");
  assert.doesNotMatch(detailLink, /aria-label=/);
  assert.match(source, /<bdi dir="auto">\{title\}<\/bdi>/);
});

test("MediaCard quick actions keep title-specific accessible labels", () => {
  assert.match(source, /mediaCard\.addToWatchlist/);
  assert.match(source, /mediaCard\.markWatched/);
});
