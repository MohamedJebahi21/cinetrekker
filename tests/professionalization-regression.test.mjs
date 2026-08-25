import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const heroSource = fs.readFileSync(
  path.join(repoRoot, "src/components/HeroSection.tsx"),
  "utf8",
);
const detailsSource = fs.readFileSync(
  path.join(repoRoot, "src/pages/Details.tsx"),
  "utf8",
);
const mediaCardSource = fs.readFileSync(
  path.join(repoRoot, "src/components/MediaCard.tsx"),
  "utf8",
);
const homeStateSource = fs.readFileSync(
  path.join(repoRoot, "src/components/home/HomeSectionState.tsx"),
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

test("hero keeps one primary content composition and accessible spotlight controls", () => {
  assert.match(heroSource, /home\.heroValueProp/);
  assert.match(heroSource, /<Link to=\{activeMediaPath\}>/);
  assert.match(heroSource, /topWeekly\.map/);
  assert.match(heroSource, /aria-pressed=\{isActive\}/);
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

test("details actions make guest persistence and primary states discoverable", () => {
  assert.match(detailsSource, /details\.guestTrackingHint/);
  assert.match(detailsSource, /handleAddToWatchlist/);
  assert.match(detailsSource, /handleMarkAsWatched/);
});

test("media cards expose focused actions and preserve visible-title semantics", () => {
  const detailLink = mediaCardSource.match(
    /<Link\s+[\s\S]*?to=\{buildMediaPath\(mediaType, media\.id, title\)\}[\s\S]*?>/,
  )?.[0];
  assert.ok(detailLink, "expected the MediaCard detail Link");
  assert.doesNotMatch(detailLink, /aria-label=/);
  assert.match(mediaCardSource, /aria-pressed=\{optimisticInWatchlist\}/);
  assert.match(mediaCardSource, /aria-pressed=\{optimisticWatched\}/);
});

test("shared home states announce loading and recovery feedback", () => {
  assert.match(homeStateSource, /role="alert"/);
  assert.match(homeStateSource, /aria-live="polite"/);
  assert.match(homeStateSource, /role="status"/);
});
