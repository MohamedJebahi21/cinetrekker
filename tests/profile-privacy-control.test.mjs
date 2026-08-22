import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const profilePagePath = new URL("../src/pages/Profile.tsx", import.meta.url);
const profileServicePath = new URL("../src/services/profile.ts", import.meta.url);

test("profile edit surface provides an explicit private-profile enable or disable button", async () => {
  const source = await readFile(profilePagePath, "utf8");

  assert.match(source, /text\("profile\.privateProfile", "Private profile"\)/);
  assert.match(source, /text\("profile\.currentlyPublic", "Currently public"\)/);
  assert.match(source, /text\("profile\.currentlyPrivate", "Currently private"\)/);
  assert.match(source, /text\("profile\.enablePrivateProfile", "Enable private profile"\)/);
  assert.match(source, /text\("profile\.disablePrivateProfile", "Disable private profile"\)/);
  assert.match(source, /profilePrivacyMutation\.mutate\(!isPublic\)/);
  assert.match(source, /disabled=\{!user\?\.id \|\| profilePrivacyMutation\.isPending\}/);
  assert.doesNotMatch(source, /<Switch\b/);
});

test("profile privacy action updates only visibility and restores the prior state when saving fails", async () => {
  const source = await readFile(profilePagePath, "utf8");

  assert.match(source, /const profilePrivacyMutation = useMutation/);
  assert.match(source, /profileService\.saveProfile\(user\.id, \{ is_public: nextIsPublic \}\)/);
  assert.match(source, /const previousIsPublic = isPublic/);
  assert.match(source, /setIsPublic\(nextIsPublic\)/);
  assert.match(source, /if \(context\) setIsPublic\(context\.previousIsPublic\)/);
  assert.match(source, /window\.dispatchEvent\(new CustomEvent\("profileUpdated"\)\)/);
});

test("profile service supports partial visibility writes without requiring other profile fields", async () => {
  const source = await readFile(profileServicePath, "utf8");

  assert.match(source, /async saveProfile\(\s*userId: string,\s*profile: Partial<UserProfile>/s);
  assert.match(source, /\.update\(profileData\)/);
});
