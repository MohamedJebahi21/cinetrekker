import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [navigationSource, notificationSource] = await Promise.all([
  readFile(new URL("../src/components/UnifiedNav.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/NotificationBell.tsx", import.meta.url), "utf8"),
]);

const preferencesStart = navigationSource.indexOf('aria-label={t("nav.preferences", "Preferences")}');
const preferencesEnd = navigationSource.indexOf("topbar-menu-button", preferencesStart);
const preferencesMenu = navigationSource.slice(preferencesStart, preferencesEnd);

test("UnifiedNav keeps Settings visible while nesting language and theme controls in compact quick-control submenus", () => {
  assert.ok(preferencesStart >= 0);
  assert.ok(preferencesEnd > preferencesStart);
  assert.match(preferencesMenu, /Quick controls/);
  assert.match(preferencesMenu, /<Link to="\/settings"/);
  assert.match(preferencesMenu, /<DropdownMenuSub>/);
  assert.match(preferencesMenu, /activeLanguageLabel/);
  assert.match(preferencesMenu, /languages\.map\(\(language\) =>/);
  assert.match(preferencesMenu, /<DropdownMenuRadioGroup value=\{activeLanguageCode\}/);
  assert.match(preferencesMenu, /\["dark", "light", "oled"\] as const/);
  assert.match(preferencesMenu, /<DropdownMenuRadioGroup value=\{theme\}/);
  assert.match(preferencesMenu, /Pure black/);
});

test("UnifiedNav keeps focused top-level utilities while removing separate palette and globe header imports", () => {
  assert.match(navigationSource, /<NotificationBell \/>/);
  assert.match(navigationSource, /<UserProfileDropdown/);
  assert.match(navigationSource, /topbar-menu-button/);
  assert.doesNotMatch(navigationSource, /icons\/palette/);
  assert.doesNotMatch(navigationSource, /icons\/globe/);
});

test("NotificationBell presents a concise inbox with individual, bulk, and preferences actions without duplicate primary controls", () => {
  assert.match(notificationSource, /const previewNotifications = unreadNotifications\.slice\(0, 3\)/);
  assert.match(notificationSource, /Mark all as read/);
  assert.match(notificationSource, /Manage notification preferences/);
  assert.match(notificationSource, /aria-label=\{`Mark notification as read:/);
  assert.match(notificationSource, /<Settings2 className="h-4 w-4"/);
  assert.match(notificationSource, /Release and watchlist updates, in one place\./);
  assert.doesNotMatch(notificationSource, /View all notifications/);
});
