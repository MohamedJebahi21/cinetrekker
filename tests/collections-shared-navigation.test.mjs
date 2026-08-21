import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Collections inherits exactly one shared navigation from the application shell", async () => {
  const [collections, app] = await Promise.all([
    readSource("src/pages/Collections.tsx"),
    readSource("src/App.tsx"),
  ]);

  assert.doesNotMatch(collections, /import \{ UnifiedNav \} from "@\/components\/UnifiedNav";/);
  assert.doesNotMatch(collections, /<UnifiedNav\s*\/>/);
  assert.match(collections, /<ProtectedRoute>/);
  assert.match(app, /<UnifiedNav\s*\/>/);
});
