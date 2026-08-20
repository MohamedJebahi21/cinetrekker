import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const schemaSource = fs.readFileSync(path.join(root, "src/lib/schema.ts"), "utf8");

test("Home WebSite markup consistently prefers CineTrekker over the deployment hostname", () => {
  assert.match(indexHtml, /"@type": "WebSite"/);
  assert.match(indexHtml, /"name": "CineTrekker"/);
  assert.match(indexHtml, /"alternateName": \["Cine Trekker"\]/);
  assert.doesNotMatch(indexHtml, /"alternateName"[^\n]*cinetrekker\.vercel\.app/);

  assert.match(schemaSource, /name,/);
  assert.match(schemaSource, /alternateName: \["Cine Trekker"\]/);
});
