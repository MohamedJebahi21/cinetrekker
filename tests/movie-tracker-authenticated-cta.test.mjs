import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/pages/MovieTracker.tsx", import.meta.url), "utf8");

test("movie tracker landing keeps signup conversion for visitors and offers a watchlist action to signed-in users", () => {
  assert.match(source, /import \{ useAuth \} from "@\/contexts\/AuthContext";/);
  assert.match(source, /const \{ user \} = useAuth\(\);/);
  assert.match(source, /const isAuthenticated = Boolean\(user\);/);
  assert.match(source, /to=\{isAuthenticated \? "\/watchlist" : "\/signup"\}/);
  assert.match(source, /isAuthenticated \? "Open your watchlist" : "Create a free account"/);
  assert.match(source, /Your watchlist and episode progress are ready whenever you return/);
});
