import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationSource = await readFile(
  new URL(
    "../supabase/migrations/20260822001000_add_discoverable_private_profile_rpc.sql",
    import.meta.url,
  ),
  "utf8",
);
const socialSource = await readFile(
  new URL("../src/services/social.ts", import.meta.url),
  "utf8",
);
const peopleSource = await readFile(
  new URL("../src/pages/People.tsx", import.meta.url),
  "utf8",
);
const userProfileSource = await readFile(
  new URL("../src/pages/UserProfile.tsx", import.meta.url),
  "utf8",
);
const searchDropdownSource = await readFile(
  new URL("../src/components/SearchDropdown.tsx", import.meta.url),
  "utf8",
);
const commandPaletteSource = await readFile(
  new URL("../src/components/CommandPalette.tsx", import.meta.url),
  "utf8",
);

test("private members are searchable only by a non-empty name match and return a minimal database shape", () => {
  assert.match(migrationSource, /CREATE OR REPLACE FUNCTION public\.search_discoverable_profiles/);
  assert.match(migrationSource, /WHERE search\.term IS NOT NULL/);
  assert.match(migrationSource, /lower\(COALESCE\(p\.display_name, ''\)\) LIKE/);
  assert.match(migrationSource, /CASE WHEN p\.is_public OR p\.user_id = auth\.uid\(\) THEN p\.bio ELSE NULL END AS bio/);
  assert.match(migrationSource, /THEN COALESCE\(p\.avatar_url, p\.profile_photo\)\s+ELSE NULL/s);
  assert.match(migrationSource, /CASE WHEN p\.is_public OR p\.user_id = auth\.uid\(\) THEN p\.favorite_titles ELSE NULL END/);
  assert.match(migrationSource, /CASE WHEN p\.is_public OR p\.user_id = auth\.uid\(\) THEN p\.created_at ELSE NULL END/);
  assert.match(migrationSource, /ELSE 0\s+END AS followers_count/s);
  assert.match(migrationSource, /ELSE 0\s+END AS comments_count/s);
  assert.match(migrationSource, /GRANT EXECUTE ON FUNCTION public\.search_discoverable_profiles\(text, integer\) TO anon, authenticated/);
});

test("private profile routes return an identity-only summary instead of a not-found state", () => {
  assert.match(migrationSource, /CREATE OR REPLACE FUNCTION public\.get_discoverable_profile_summary/);
  assert.match(migrationSource, /WHERE p\.user_id = target_user_id/);
  assert.match(migrationSource, /GRANT EXECUTE ON FUNCTION public\.get_discoverable_profile_summary\(uuid\) TO anon, authenticated/);
  assert.match(socialSource, /async getDiscoverableProfileSummary/);
  assert.match(socialSource, /get_discoverable_profile_summary/);
  assert.match(userProfileSource, /socialService\.getDiscoverableProfileSummary\(userId\)/);
  assert.match(userProfileSource, /const isPrivateProfile = !resolvedProfile\.is_public && !isOwnProfile/);
  assert.match(userProfileSource, /This member keeps their profile details private\./);
  assert.match(userProfileSource, /canReadProfileDetails/);
});

test("all member-search entry points use discoverable results and private cards omit detail and follow controls", () => {
  assert.match(socialSource, /async searchDiscoverableProfiles/);
  assert.match(searchDropdownSource, /socialService\.searchDiscoverableProfiles\(q\)/);
  assert.match(commandPaletteSource, /socialService\.searchDiscoverableProfiles\(query\.trim\(\)\)/);
  assert.match(peopleSource, /socialService\.searchDiscoverableProfiles\(deferredSearch\)/);
  assert.match(peopleSource, /const isPrivateProfile = !profile\.is_public && !isOwnProfile/);
  assert.match(peopleSource, /Private profile/);
  assert.match(peopleSource, /\{!isPrivateProfile && \(/);
  assert.match(peopleSource, /!isOwnProfile && !isPrivateProfile/);
});
