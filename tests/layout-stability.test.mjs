import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(
  new URL("../src/index.css", import.meta.url),
  "utf8",
);

test("overlay interactions preserve a stable desktop viewport width", () => {
  assert.match(
    styles,
    /@media\s*\(min-width:\s*768px\)\s*\{[\s\S]*?html\s*\{[\s\S]*?scrollbar-gutter:\s*stable;/,
    "The document root must reserve scrollbar space when overlays lock scrolling.",
  );
  assert.match(
    styles,
    /body\s*\{[\s\S]*?overflow-x:\s*hidden;/,
    "The page body must not expose horizontal overflow during interactions.",
  );
  assert.match(
    styles,
    /\.ct-page-shell\s*\{[\s\S]*?overflow-x:\s*clip;/,
    "The application shell must clip incidental horizontal paint overflow.",
  );
});
