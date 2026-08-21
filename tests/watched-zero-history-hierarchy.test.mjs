import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../src/pages/Watched.tsx", import.meta.url), "utf8");
const hookSource = await readFile(new URL("../src/hooks/useWatchedFilters.ts", import.meta.url), "utf8");

test("Watched defers filters for an empty history and keeps an accessible compact loading state", () => {
  assert.match(pageSource, /hasWatchedItems \|\| hasActiveFilters \? \(/);
  assert.match(pageSource, /aria-label="Loading watched history"/);
  assert.match(pageSource, /ct-panel flex min-h-44 items-center justify-center/);
  assert.match(pageSource, /hasWatchedItems \? \(\s*<div className="media-grid">/);
});

test("Watched filters use the underlying history presence rather than filtered result count", () => {
  assert.match(hookSource, /const \{ watched, loading: userListsLoading \} = useUserLists\(\)/);
  assert.match(hookSource, /isLoading: userListsLoading \|\| detailsQuery\.isLoading/);
  assert.match(hookSource, /hasWatchedItems: watched\.length > 0/);
  assert.match(pageSource, /hasWatchedItems,/);
});
