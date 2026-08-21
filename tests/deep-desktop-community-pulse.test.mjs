import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("Community Pulse uses a lightweight follow lookup and tolerates an individual profile retrieval failure", async () => {
  const [social, feed] = await Promise.all([
    source("src/services/social.ts"),
    source("src/components/home/CommunityActivityFeed.tsx"),
  ]);

  assert.match(social, /async getFollowingIds\(userId: string\): Promise<string\[\]>/);
  assert.match(social, /\.select\("following_id"\)/);
  assert.match(social, /new Set\(/);

  assert.match(feed, /socialService\.getFollowingIds\(userId\)/);
  assert.match(feed, /followingIds\.map\(async \(followingId\) => \{\s*try/s);
  assert.match(feed, /catch \{\s*return \[\] as ActivityItem\[\];/);
});
