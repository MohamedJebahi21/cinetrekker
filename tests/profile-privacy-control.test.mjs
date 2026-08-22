import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const settingsPagePath = new URL("../src/pages/Settings.tsx", import.meta.url);
const profilePagePath = new URL("../src/pages/Profile.tsx", import.meta.url);
const homepagePath = new URL("../src/pages/Index.tsx", import.meta.url);
const profileServicePath = new URL("../src/services/profile.ts", import.meta.url);

test("Settings owns the explicit private-profile enable or disable button", async () => {
  const settingsSource = await readFile(settingsPagePath, "utf8");
  const profileSource = await readFile(profilePagePath, "utf8");

  assert.match(settingsSource, /title=\{text\("profile\.privacySettings", "Privacy settings"\)\}/);
  assert.match(settingsSource, /text\("profile\.privateProfile", "Private profile"\)/);
  assert.match(settingsSource, /text\("profile\.currentlyPublic", "Currently public"\)/);
  assert.match(settingsSource, /text\("profile\.currentlyPrivate", "Currently private"\)/);
  assert.match(settingsSource, /text\("profile\.enablePrivateProfile", "Enable private profile"\)/);
  assert.match(settingsSource, /text\("profile\.disablePrivateProfile", "Disable private profile"\)/);
  assert.match(settingsSource, /onClick=\{\(\) => void handleProfilePrivacyToggle\(\)\}/);
  assert.match(settingsSource, /disabled=\{!user\?\.id \|\| isUpdatingProfilePrivacy\}/);
  assert.doesNotMatch(profileSource, /profilePrivacyMutation/);
  assert.doesNotMatch(profileSource, /enablePrivateProfile/);
});

test("Settings privacy action writes only visibility and restores the prior state when saving fails", async () => {
  const source = await readFile(settingsPagePath, "utf8");

  assert.match(source, /const handleProfilePrivacyToggle = async \(\) =>/);
  assert.match(source, /const previousIsPublic = isPublicProfile/);
  assert.match(source, /const nextIsPublic = !previousIsPublic/);
  assert.match(source, /profileService\.updateProfile\(user\.id, \{ is_public: nextIsPublic \}\)/);
  assert.match(source, /setIsPublicProfile\(previousIsPublic\)/);
  assert.match(source, /window\.dispatchEvent\(new CustomEvent\("profileUpdated"\)\)/);
  assert.doesNotMatch(source, /is_public: false,/);
});

test("Daily Trivia is not rendered on the homepage", async () => {
  const source = await readFile(homepagePath, "utf8");

  assert.doesNotMatch(source, /DailyTriviaCard/);
});

test("profile service supports partial visibility writes without requiring other profile fields", async () => {
  const source = await readFile(profileServicePath, "utf8");

  assert.match(source, /async updateProfile\(\s*userId: string,\s*updates: Partial<UserProfile>/s);
  assert.match(source, /return this\.saveProfile\(userId, updates\)/);
});
