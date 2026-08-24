import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("Up Next can offer a saved title as a read-only tonight decision fallback", async () => {
  const [source, ...locales] = await Promise.all([
    read("src/components/home/UpNextCommandCenter.tsx"),
    ...["en", "ar", "fr", "tr", "es", "de"].map((locale) =>
      read(`src/locales/${locale}.json`),
    ),
  ]);

  assert.match(source, /useMovieDetails\(/);
  assert.match(source, /const queueCandidate = useMemo/);
  assert.match(source, /const shouldResolveQueue =/);
  assert.match(source, /home\.upNextQueueFocusMeta/);
  assert.match(source, /to=\{primaryHref\}/);
  assert.doesNotMatch(source, /addToWatchlist\(|removeFromWatchlist\(/);

  for (const locale of locales) {
    assert.match(locale, /"upNextQueueFocusMeta"\s*:\s*".+"/);
  }
});
