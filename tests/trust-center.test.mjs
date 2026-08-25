import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("trust center links the core public control and support resources", () => {
  const page = read("src/pages/TrustCenter.tsx");
  const app = read("src/AppRoutes.tsx");
  const footer = read("src/components/Footer.tsx");

  for (const route of ["/privacy", "/cookies", "/accessibility", "/status", "/terms", "/feedback"]) {
    assert.match(page, new RegExp(`href: "${route.replace("/", "\\/")}"`));
  }

  assert.match(page, /trustCenter\.measurementDescription/);
  assert.match(app, /path="\/trust"/);
  assert.match(footer, /to="\/trust"/);
  assert.match(footer, /footer\.trustCenter/);
});
