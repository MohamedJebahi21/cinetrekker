import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("signed-in notification lifecycle filters stale rows and archives instead of deleting", () => {
  const hook = read("src/hooks/useNotifications.ts");
  const page = read("src/pages/Notifications.tsx");

  assert.match(hook, /\.is\("archived_at", null\)/);
  assert.match(hook, /expires_at\.is\.null,expires_at\.gt/);
  assert.match(hook, /const archiveMutation/);
  assert.match(hook, /update\(\{ archived_at: new Date\(\)\.toISOString\(\), is_read: true \}\)/);
  assert.doesNotMatch(hook, /\.from\("notifications"\)\s*\.delete\(\)/);
  assert.match(hook, /archiveNotification/);
  assert.match(page, /notifications\.archiveItem/);
  assert.match(page, /notifications\.archiveFromInbox/);
  assert.match(page, /notifications\.currentStateUnread/);
  assert.match(page, /notifications\.currentStateClear/);
  assert.match(page, /function groupNotifications/);
  assert.match(page, /notification\.group_key \|\| notification\.id/);
  assert.match(page, /groupedCount > 1/);
  assert.match(page, /notifications\.groupedUpdates/);
  assert.doesNotMatch(page, /Delete notification/);
});
