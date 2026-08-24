import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("scheduled notification worker is cursor-bounded and preference-aware", () => {
  const worker = read("api/jobs/check-followed-updates.js");

  assert.match(worker, /notification_followed_title_batch/);
  assert.match(worker, /notification_worker_state/);
  assert.match(worker, /DEFAULT_BATCH_SIZE = 12/);
  assert.match(worker, /MAX_BATCH_SIZE = 50/);
  assert.match(worker, /release_updates/);
  assert.match(worker, /releaseUpdatesEnabled/);
  assert.match(worker, /onConflict: "user_id,event_key"/);
  assert.match(worker, /ignoreDuplicates: true/);
  assert.match(worker, /expires_at: expiresAt/);
  assert.doesNotMatch(worker, /\.from\("movie_followers"\)\s*\.select\("user_id, movie_id"\)\s*;/);
});

test("notification scale migration is additive and protects client access", () => {
  const migration = read("supabase/migrations/20260824190000_notification_scale_and_retention.sql");

  assert.match(migration, /ADD COLUMN IF NOT EXISTS group_key/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS expires_at/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS archived_at/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.notification_worker_state/);
  assert.match(migration, /notification_followed_title_batch/);
  assert.match(migration, /REVOKE ALL ON FUNCTION/);
  assert.doesNotMatch(migration, /DELETE FROM public\.notifications/);
});
