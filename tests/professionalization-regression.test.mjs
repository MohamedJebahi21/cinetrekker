import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const heroSource = fs.readFileSync(
  path.join(repoRoot, "src/components/HeroSection.tsx"),
  "utf8",
);
const navSource = fs.readFileSync(
  path.join(repoRoot, "src/components/UnifiedNav.tsx"),
  "utf8",
);
const stylesSource = fs.readFileSync(
  path.join(repoRoot, "src/index.css"),
  "utf8",
);
const todoSource = fs.readFileSync(
  path.join(repoRoot, "docs/PROFESSIONALIZATION_TODO.md"),
  "utf8",
);

test("hero includes a supporting desktop poster treatment without exposing duplicate content", () => {
  assert.match(heroSource, /Supporting poster treatment/);
  assert.match(heroSource, /aria-hidden=\"true\"/);
  assert.match(heroSource, /getImageUrl\(activeItem\.poster_path/);
  assert.match(heroSource, /ct-hero-supporting-poster/);
  assert.match(stylesSource, /\.ct-hero-supporting-poster-card/);
});

test("desktop navigation exposes the core discovery and library destinations", () => {
  assert.match(navSource, /aria-label=\{t\("nav\.primary", "Primary navigation"\)\}/);
  assert.match(navSource, /path: \"\/discover\"/);
  assert.match(navSource, /path: \"\/watchlist\"/);
  assert.match(navSource, /path: \"\/watched\"/);
  assert.match(navSource, /aria-current=\{isActive \? \"page\" : undefined\}/);
});

test("professionalization TODO keeps owner-only work explicit", () => {
  assert.match(todoSource, /\[owner\]/);
  assert.match(todoSource, /Inventory and rotate .* secrets/i);
  assert.match(todoSource, /backup-and-recovery drill/);
  assert.match(todoSource, /independent keyboard and screen-reader review/i);
  assert.match(todoSource, /qualified privacy, regional-compliance, sponsorship, commercial, and legal approval/i);
});
