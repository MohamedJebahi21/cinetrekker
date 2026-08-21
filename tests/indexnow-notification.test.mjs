import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
const readProjectFile = (path) => readFile(new URL(path, root), "utf8");
const key = "74eaa41ff1bf44c080731e3214963b72";

test("IndexNow notifications use a root verification file and a curated public URL list", async () => {
  const [script, verificationFile] = await Promise.all([
    readProjectFile("scripts/notify-indexnow.mjs"),
    readProjectFile(`public/${key}.txt`),
  ]);

  assert.equal(verificationFile.trim(), key);
  assert.match(script, /https:\/\/api\.indexnow\.org\/indexnow/);
  assert.match(script, new RegExp(`const INDEXNOW_KEY = "${key}"`));
  assert.match(script, /await verifyOwnershipFile\(\);/);
  assert.match(script, /\"\/movie-tracker\"/);
  assert.match(script, /\"\/sitemap\.xml\"/);
  assert.doesNotMatch(script, /\/user\//);
  assert.doesNotMatch(script, /\/profile/);
  assert.match(script, /process\.exitCode = 1/);
});
