import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const migration = await readFile(
  new URL("supabase/migrations/20261101090000_add_watched_based_people_suggestions.sql", root),
  "utf8",
);
const rail = await readFile(
  new URL("src/components/home/SuggestedPeopleRail.tsx", root),
  "utf8",
);
const home = await readFile(new URL("src/pages/Index.tsx", root), "utf8");
const service = await readFile(new URL("src/services/social.ts", root), "utf8");

test("watched-title suggestions are authenticated, public-only, and computed without exposing histories", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_suggested_profiles_by_watched/);
  assert.match(migration, /SECURITY DEFINER[\s\S]*SET search_path = public/);
  assert.match(migration, /viewer_watched\.user_id = auth\.uid\(\)/);
  assert.match(migration, /target\.is_public = true/);
  assert.match(migration, /viewer_watched\.status IS DISTINCT FROM 'plan_to_watch'/);
  assert.match(migration, /target_watched\.status IS DISTINCT FROM 'plan_to_watch'/);
  assert.match(migration, /count\(DISTINCT \(viewer_watched\.media_id, viewer_watched\.media_type\)\) AS common_watches/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_suggested_profiles_by_watched\(integer\) FROM anon/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_suggested_profiles_by_watched\(integer\) TO authenticated/);
  assert.match(service, /get_suggested_profiles_by_watched/);
});

test("the suggested rail is disabled and hidden for guests and filters to shared watches", () => {
  assert.match(rail, /enabled: Boolean\(user\?\.id\)/);
  assert.match(rail, /if \(!user\) return null/);
  assert.match(rail, /profile\.common_watches \?\? 0\) > 0/);
  assert.match(rail, /socialService\.listSuggestedProfiles\(\)/);
  assert.equal((home.match(/<SuggestedPeopleRail \/>/g) ?? []).length, 1);
  assert.match(home, /\) : user \? \(/);
});
