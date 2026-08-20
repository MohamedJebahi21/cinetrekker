import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/20260820215500_harden_private_profile_select_rls.sql",
  import.meta.url,
);

test("private-profile remediation removes the known permissive read policy and restores owner-only direct reads", async () => {
  const source = await readFile(migrationPath, "utf8");

  assert.match(source, /ALTER TABLE public\.profiles ENABLE ROW LEVEL SECURITY/);
  assert.match(
    source,
    /DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public\.profiles/,
  );
  assert.match(source, /DROP POLICY IF EXISTS profiles_select_own ON public\.profiles/);
  assert.match(source, /CREATE POLICY profiles_select_own/);
  assert.match(source, /FOR SELECT\s+USING \(auth\.uid\(\) = user_id\)/s);
  assert.match(source, /curated SECURITY DEFINER RPCs/);
  assert.match(source, /curated public-profile\s*\n-- RPCs/);
  assert.doesNotMatch(source, /USING \(is_public = true\)/);
});
