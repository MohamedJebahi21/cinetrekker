import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

test("DEF-01: Footer uses local TMDB attribution asset instead of external hotlink", () => {
  const footerSrc = fs.readFileSync(path.join(ROOT, "src/components/Footer.tsx"), "utf8");
  assert.match(footerSrc, /src="\/tmdb-logo\.svg"/);
  assert.doesNotMatch(footerSrc, /https:\/\/www\.themoviedb\.org\/assets\//);

  const svgPath = path.join(ROOT, "public/tmdb-logo.svg");
  assert.equal(fs.existsSync(svgPath), true, "public/tmdb-logo.svg must exist");
  const svgContent = fs.readFileSync(svgPath, "utf8");
  assert.match(svgContent, /<svg[\s>]/i);
});

test("DEF-02: OnboardingQuickStart uses valid TMDB poster paths and onError fallback", () => {
  const src = fs.readFileSync(path.join(ROOT, "src/components/OnboardingQuickStart.tsx"), "utf8");
  assert.doesNotMatch(src, /uKvVjK1q1NVx4G2Z378L1Rkm164\.jpg/);
  assert.doesNotMatch(src, /39wmItIWsg5sZMyRUHLkWBcuVqa\.jpg/);
  assert.doesNotMatch(src, /cuV2O52338nmyi2UQ5nYuP5oW5x\.jpg/);
  assert.match(src, /getImageUrl\(/);
  assert.match(src, /onError=/);
  assert.match(src, /failedPosters/);
});

test("DEF-03: QuickStart and TonightsPick keys exist in en and ar locales with RTL support", () => {
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src/locales/en.json"), "utf8"));
  const ar = JSON.parse(fs.readFileSync(path.join(ROOT, "src/locales/ar.json"), "utf8"));

  const requiredKeys = [
    "common.skip",
    "common.done",
    "onboarding.quickstartEyebrow",
    "onboarding.quickstartTitle",
    "onboarding.quickstartDesc",
    "onboarding.pickFavorites",
    "onboarding.selectedCount",
    "home.tonightsPickKicker",
    "home.tonightsPickTitle",
    "home.decideWhatToWatch",
    "home.vibes.action.label",
    "home.formats.quick.label",
    "home.eras.any.label",
  ];

  const get = (obj, dotted) => dotted.split(".").reduce((o, k) => (o && k in o ? o[k] : undefined), obj);

  for (const key of requiredKeys) {
    assert.ok(get(en, key), `Missing ${key} in en.json`);
    const arVal = get(ar, key);
    assert.ok(arVal, `Missing ${key} in ar.json`);
    assert.notEqual(arVal, get(en, key), `Arabic translation for ${key} should not equal English`);
  }

  const tpSrc = fs.readFileSync(path.join(ROOT, "src/components/home/TonightsPick.tsx"), "utf8");
  assert.match(tpSrc, /text-start/);
  assert.match(tpSrc, /rtl:rotate-180/);
});

test("IMP-04: Startup entry and hooks defer Zod validation from initial bundle", () => {
  const mainSrc = fs.readFileSync(path.join(ROOT, "src/main.tsx"), "utf8");
  assert.doesNotMatch(mainSrc, /from\s+["']zod["']/);

  for (const rel of [
    "src/contexts/UserListsContext.tsx",
    "src/contexts/AuthenticatedUserListsProvider.tsx",
    "src/hooks/useSearch.ts",
    "src/hooks/useWatchedQueries.ts",
    "src/hooks/useFollowedShows.ts",
  ]) {
    const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.doesNotMatch(content, /^import\s+.*from\s+["']@\/lib\/validation["']/m, `${rel} should dynamically import validation`);
    assert.match(content, /import\(["']@\/lib\/validation["']\)/, `${rel} should dynamically import @/lib/validation`);
  }
});

test("IMP-03: Calendar nextRelease scopes to active period and upcoming dates", () => {
  const calSrc = fs.readFileSync(path.join(ROOT, "src/pages/Calendar.tsx"), "utf8");
  assert.match(calSrc, /periodDateKeys/);
  assert.match(calSrc, /upcomingInPeriod/);
  assert.match(calSrc, /todayKey/);
});
