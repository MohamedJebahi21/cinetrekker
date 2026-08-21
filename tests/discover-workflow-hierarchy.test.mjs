import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/pages/Discover.tsx", import.meta.url), "utf8");

test("Discover keeps category browsing compact and reveals mood picks on demand", () => {
  assert.match(source, /const \[moodPickerOpen, setMoodPickerOpen\] = useState\(false\)/);
  assert.match(source, /ct-toolbar flex flex-col gap-3/);
  assert.match(source, /aria-label="Discovery controls"/);
  assert.match(source, /aria-label="Browse discovery categories"/);
  assert.match(source, /aria-controls="discover-mood-picker"/);
  assert.match(source, /aria-expanded=\{moodPickerOpen \|\| activeMood !== null\}/);
  assert.match(source, /\{\(moodPickerOpen \|\| activeMood !== null\) && \(/);
  assert.match(source, /id="discover-mood-picker"/);
});

test("Discover preserves all category destinations and mood-result links", () => {
  for (const destination of [
    "/trending",
    "/search?type=movie",
    "/search?type=tv",
    "/search?sort=vote_average.desc",
    "/search?sort=release_date.desc",
    "/genres",
    "/decades",
    "/awards",
  ]) {
    assert.ok(source.includes(destination), `expected category destination ${destination}`);
  }

  assert.match(source, /Link to=\{`\/search\?genre=\$\{MOODS\[activeMood\]\.genre\}&sort=\$\{MOODS\[activeMood\]\.sort\}`\}/);
  assert.match(source, /Showing <span className="font-semibold text-foreground">\{MOODS\[activeMood\]\.label\}<\/span> picks/);
});
