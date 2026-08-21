import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/components/MediaCard.tsx", import.meta.url), "utf8");

test("MediaCard keeps CSS interactions without eager Framer Motion tilt setup", () => {
  assert.doesNotMatch(source, /from "framer-motion"/);
  assert.doesNotMatch(source, /useMotionValue|useTransform|useSpring|motion\.div/);
  assert.match(source, /<div className="h-full">/);
  assert.match(source, /md:hover:border-primary\/20/);
  assert.match(source, /active:scale-\[0\.98\]/);
});

test("MediaCard retains its existing watchlist and watched action handlers", () => {
  assert.match(source, /handleWatchlistClick/);
  assert.match(source, /handleWatchedClick/);
  assert.match(source, /TVWatchStatusModal/);
});
