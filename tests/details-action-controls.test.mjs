import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);

test("detail-page tracking controls are form-safe and mobile share is named", async () => {
  const source = await readFile(
    new URL("src/components/details/DetailsActions.tsx", root),
    "utf8",
  );

  assert.equal((source.match(/type="button"/g) || []).length, 6);
  assert.match(source, /aria-label=\{t\('actions\.share', 'Share'\)\}/);
  assert.match(source, /mobile-nav-safe/);
  assert.match(source, /min-h-11/);
});

test("season episode failures and long waits provide a bounded retry state", async () => {
  const source = await readFile(new URL("src/pages/Details.tsx", root), "utf8");

  assert.match(source, /isError: seasonError/);
  assert.match(source, /useLoadingTimeout\(seasonLoading, 12_000, seasonRetryVersion\)/);
  assert.match(source, /seasonError \|\| seasonLoadingTimedOut/);
  assert.match(source, /setSeasonRetryVersion\(\(version\) => version \+ 1\)/);
  assert.match(source, /seasonUnavailable/);
});
