import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

function normalize(range) {
  const program = [
    'import { normalizeWatchedYearRange } from "./src/lib/watchedYearRange.ts";',
    `console.log(JSON.stringify(normalizeWatchedYearRange(${JSON.stringify(range)}, { minYear: 1998, maxYear: 2026 })));`,
  ].join("\n");

  return JSON.parse(
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "--eval", program],
      { cwd: process.cwd(), encoding: "utf8" },
    ).trim(),
  );
}

test("keeps an already valid watched-history year range", () => {
  assert.deepEqual(normalize([2005, 2020]), [2005, 2020]);
});

test("orders an inverted watched-history range instead of producing an empty result", () => {
  assert.deepEqual(normalize([2022, 2008]), [2008, 2022]);
});

test("clamps out-of-range and non-finite year input to the available history bounds", () => {
  assert.deepEqual(normalize([1800, 2099]), [1998, 2026]);
  assert.deepEqual(normalize([null, null]), [1998, 2026]);
});
