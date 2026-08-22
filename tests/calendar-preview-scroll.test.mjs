import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/pages/Calendar.tsx", import.meta.url),
  "utf8",
);

test("Calendar media preview confines the dialog to the viewport and scrolls details inside it", () => {
  assert.match(
    source,
    /<DialogContent className="max-h-\[calc\(100dvh-2rem\)\] max-w-xl overflow-hidden/,
  );
  assert.match(
    source,
    /<div className="relative flex max-h-\[calc\(100dvh-2rem\)\] flex-col">/,
  );
  assert.match(
    source,
    /h-48 w-full shrink-0 overflow-hidden/,
  );
  assert.match(
    source,
    /min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain/,
  );
});
