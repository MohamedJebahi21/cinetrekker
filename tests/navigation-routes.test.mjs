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

test("R08 and R13: guest top-bar Sign In is labeled and /following uses Tracked Shows", () => {
  assert.match(unifiedNavSource, /to="\/login"[\s\S]*?<span className="whitespace-nowrap">\{t\("nav\.signIn", "Sign In"\)\}<\/span>/);
  assert.match(routesSource, /path: "\/following",\s*labelKey: "nav\.following",\s*defaultLabel: "Tracked Shows"/);
});

test("R01: UserProfileDropdown exposes 6 account destinations with Radix semantics and retains header and Sign Out", async () => {
  const dropdownSource = await readFile(new URL("../src/components/UserProfileDropdown.tsx", import.meta.url), "utf8");

  for (const [path, key] of [
    ["/profile", "nav.profile"],
    ["/stats", "nav.stats"],
    ["/achievements", "nav.achievements"],
    ["/year-in-review", "nav.yearInReview"],
    ["/settings", "nav.settings"],
    ["/notifications", "notifications.title"],
  ]) {
    assert.ok(dropdownSource.includes(`path: '${path}'`), `includes route ${path}`);
    assert.ok(dropdownSource.includes(`labelKey: '${key}'`), `uses existing i18n key ${key}`);
  }

  assert.match(dropdownSource, /DropdownMenuSeparator/);
  assert.match(dropdownSource, /DropdownMenuGroup/);
  assert.match(dropdownSource, /<DropdownMenuItem[^>]*asChild>[\s\S]*?<Link[\s\S]*?onClick=\{\(\) => setIsOpen\(false\)\}/);
  assert.match(dropdownSource, /aria-current=\{isActive \? 'page' : undefined\}/);
  assert.match(dropdownSource, /navigate\('\/profile'\)|navigate\("\/profile"\)/);
  assert.match(dropdownSource, /onClick=\{handleSignOut\}/);
  assert.match(dropdownSource, /t\('nav\.signOut', 'Sign Out'\)/);
});
