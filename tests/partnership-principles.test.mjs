import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("partnership principles preserve transparent, non-committal commercial governance", () => {
  const page = read("src/pages/Partnerships.tsx");
  const app = read("src/App.tsx");
  const footer = read("src/components/Footer.tsx");

  assert.match(page, /No active sponsorship program/);
  assert.match(page, /Clear sponsorship labeling/);
  assert.match(page, /never guarantee reach, conversions, or outcomes/);
  assert.match(page, /does not use this page to offer advertising/);
  assert.match(app, /path="\/partnerships"/);
  assert.match(footer, /to="\/partnerships"/);
  assert.match(footer, /footer\.partnershipPrinciples/);
});
