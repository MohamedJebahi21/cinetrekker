import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [navigationSource, notificationSource, settingsSource, i18nSource] = await Promise.all([
  readFile(new URL("../src/components/UnifiedNav.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/NotificationBell.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/pages/Settings.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/i18n.ts", import.meta.url), "utf8"),
]);

const preferencesStart = navigationSource.indexOf('aria-label={t("nav.preferences", "Preferences")}');
const preferencesEnd = navigationSource.indexOf("topbar-menu-button", preferencesStart);
const preferencesMenu = navigationSource.slice(preferencesStart, preferencesEnd);

test("UnifiedNav keeps Settings visible while nesting language and unambiguous theme controls in compact quick-control submenus", () => {
  assert.ok(preferencesStart >= 0);
  assert.ok(preferencesEnd > preferencesStart);
  assert.match(preferencesMenu, /preferences\.quickControls/);
  assert.match(preferencesMenu, /<Link to="\/settings"/);
  assert.match(preferencesMenu, /<DropdownMenuSub>/);
  assert.match(preferencesMenu, /activeLanguageLabel/);
  assert.match(preferencesMenu, /languages\.map\(\(language\) =>/);
  assert.match(preferencesMenu, /<DropdownMenuRadioGroup value=\{activeLanguageCode\}/);
  assert.match(preferencesMenu, /onValueChange=\{\(code\) => void changeLanguage\(code\)\}/);
  assert.match(preferencesMenu, /\["dark", "light", "oled"\] as const/);
  assert.match(preferencesMenu, /preferences\.currentTheme/);
  assert.match(preferencesMenu, /<Check className="h-3\.5 w-3\.5"/);
  assert.doesNotMatch(preferencesMenu, /bg-slate-800|bg-white|bg-black/);
});

test("UnifiedNav keeps focused top-level utilities while removing separate palette and globe header imports", () => {
  assert.match(navigationSource, /<NotificationBell \/>/);
  assert.match(navigationSource, /<UserProfileDropdown/);
  assert.match(navigationSource, /topbar-menu-button/);
  assert.doesNotMatch(navigationSource, /icons\/palette/);
  assert.doesNotMatch(navigationSource, /icons\/globe/);
});

test("NotificationBell provides a useful localized empty inbox plus concise individual and bulk actions", () => {
  assert.match(notificationSource, /const previewNotifications = unreadNotifications\.slice\(0, 3\)/);
  assert.match(notificationSource, /notifications\.emptyTitle/);
  assert.match(notificationSource, /notifications\.releaseAlertsTitle/);
  assert.match(notificationSource, /notifications\.watchlistAlertsTitle/);
  assert.match(notificationSource, /notifications\.exploreCalendar/);
  assert.match(notificationSource, /to="\/calendar"/);
  assert.match(notificationSource, /notifications\.historyTitle/);
  assert.match(notificationSource, /notifications\.markAllRead/);
  assert.match(notificationSource, /notifications\.managePreferences/);
  assert.match(notificationSource, /<Settings2 className="h-4 w-4"/);
  assert.doesNotMatch(notificationSource, /View all notifications/);
});

test("language changes load the selected resource bundle before changing the active interface language", () => {
  assert.match(i18nSource, /export async function changeLanguage/);
  assert.match(i18nSource, /await ensureLanguageLoaded\(code\);\s*await i18n\.changeLanguage\(code\);/);
  assert.match(settingsSource, /void changeLanguage\(langCode\);/);
  assert.doesNotMatch(settingsSource, /i18n\.changeLanguage\(langCode\)/);
});
