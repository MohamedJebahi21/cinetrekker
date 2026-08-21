import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/pages/Search.tsx", import.meta.url),
  "utf8",
);

test("Search keeps one focused page task surface with international-title support", () => {
  assert.match(source, /rounded-3xl border border-border\/60/);
  assert.match(source, /<form className="relative mt-4 max-w-3xl" onSubmit=\{handleSearchSubmit\}>/);
  assert.match(source, /search\.internationalTitleHint/);
  assert.match(source, /onChange=\{\(e\) => setQuery\(e\.target\.value\)\}/);
  assert.match(source, /onClick=\{clearSearch\}/);
});

test("Search presents desktop filters through the shared compact utility toolbar without removing filter behavior", () => {
  assert.match(source, /ct-toolbar sticky top-20 z-20 mb-5 justify-between px-3 py-2\.5/);
  assert.match(source, /onClick=\{\(\) => setDesktopFiltersExpanded\(\(current\) => !current\)\}/);
  assert.match(source, /\{desktopFiltersExpanded \? \(/);
  assert.match(source, /const clearFilters = \(\) => \{/);
  assert.match(source, /<Drawer open=\{mobileFiltersOpen\} onOpenChange=\{setMobileFiltersOpen\}>/);
});
