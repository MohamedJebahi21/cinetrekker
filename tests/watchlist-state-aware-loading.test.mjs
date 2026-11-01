import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/pages/Watchlist.tsx", import.meta.url), "utf8");

test("Watchlist uses a compact accessible loading shell before an empty personal library resolves", () => {
  assert.match(source, /const isInitialLibraryLoading =\s*userListsLoading && !isSharedView && listItems\.length === 0/);
  assert.match(source, /isInitialLibraryLoading \? \(/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-label="Loading watchlist"/);
  assert.match(source, /ct-panel flex min-h-32 items-center justify-center px-6 py-6 sm:min-h-44 sm:py-10/);
  assert.match(source, /isContentLoading \|\| filteredMedia\.length > 0 \? "ct-page-shell min-h-screen"/);
});

test("Watchlist retains its poster-grid loading shell for populated or shared content", () => {
  assert.match(source, /<MediaGrid items=\{\[\]\} isLoading columns="normal" gap="md" \/>/);
  assert.match(source, /userListsLoading && !isSharedView && listItems\.length === 0/);
});
