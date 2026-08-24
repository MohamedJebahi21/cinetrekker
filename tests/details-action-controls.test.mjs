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
