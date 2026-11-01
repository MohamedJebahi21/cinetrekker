import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routesSource = await readFile(new URL("../src/navigation/routes.ts", import.meta.url), "utf8");
const unifiedNavSource = await readFile(new URL("../src/components/UnifiedNav.tsx", import.meta.url), "utf8");
const bottomNavSource = await readFile(new URL("../src/components/MobileBottomNav.tsx", import.meta.url), "utf8");

test("desktop and mobile navigation consume the shared typed route source", () => {
  assert.match(routesSource, /export interface NavigationRoute/);
  assert.match(routesSource, /export const navigationGroups/);
  assert.match(routesSource, /export const mobileBottomRoutes/);
  assert.match(unifiedNavSource, /from "@\/navigation\/routes"/);
  assert.match(bottomNavSource, /from "@\/navigation\/routes"/);
});

test("shared navigation keeps the core destinations and main-only destinations intact", () => {
  for (const path of ["/", "/discover", "/search", "/watchlist", "/settings"]) {
    assert.ok(unifiedNavSource.includes(path) || routesSource.includes(`path: "${path}"`), `${path} remains reachable`);
  }
  assert.match(unifiedNavSource, /<NotificationBell\s*\/>/);
  assert.deepEqual(
    [...routesSource.matchAll(/\{ path: "([^"]+)"/g)].map((match) => match[1]).filter((path) => ["/", "/discover", "/search", "/watchlist"].includes(path)),
    ["/", "/watchlist", "/discover", "/search"],
  );
});
