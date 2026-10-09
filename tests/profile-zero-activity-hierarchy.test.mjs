import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../src/pages/Profile.tsx", import.meta.url), "utf8");
const heroSource = await readFile(
  new URL("../src/components/profile/ProfileIdentityHero.tsx", import.meta.url),
  "utf8",
);

test("Profile identifies a zero-activity account without changing stored profile data", () => {
  assert.match(
    pageSource,
    /const isProfileInactive =\s*uniqueWatchedEntries\.length === 0 &&\s*watchlist\.length === 0 &&\s*pinnedFavoriteKeys\.length === 0/,
  );
  assert.match(pageSource, /isInactive=\{isProfileInactive\}/);
  assert.match(pageSource, /!isProfileInactive \? \(/);
});

test("Profile offers one discovery-led starter action while preserving active analytics", () => {
  assert.match(pageSource, /<Link to="\/discover">/);
  assert.match(pageSource, /text\("watched\.discoverTitles", "Discover titles"\)/);
  assert.match(pageSource, /<motion\.section variants=\{itemVariants\} id="profile-weekly-recap">/);
  assert.match(pageSource, /profile-overview-grid grid grid-cols-1 gap-4 md:grid-cols-2/);
});

test("Profile identity hero condenses zero-value metrics and milestones only when inactive", () => {
  assert.match(heroSource, /isInactive\?: boolean/);
  assert.match(heroSource, /isInactive = false/);
  assert.match(heroSource, /\{isInactive \? \(/);
  assert.match(heroSource, /profile-stat-grid[^"\n]*sm:grid-cols-3/);
  assert.match(heroSource, /profile-milestone-row mt-5 flex flex-wrap/);
});
