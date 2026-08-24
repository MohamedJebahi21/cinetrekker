import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("measurement methodology is public, consent-aware, and excludes personal viewing data", () => {
  const page = read("src/pages/Measurement.tsx");
  const app = read("src/App.tsx");
  const trustCenter = read("src/pages/TrustCenter.tsx");

  assert.match(page, /useCookieConsent/);
  assert.match(page, /isDoNotTrackEnabled/);
  assert.match(page, /measurement\.diagnosticsEnabled/);
  assert.match(page, /measurement\.diagnosticsDnt/);
  assert.match(page, /measurement\.exclusionsCopy/);
  assert.match(page, /title names and IDs, search text, ratings/);
  assert.match(app, /path="\/measurement"/);
  assert.match(trustCenter, /to="\/measurement"/);
});
