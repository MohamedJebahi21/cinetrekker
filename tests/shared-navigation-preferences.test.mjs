import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/components/UnifiedNav.tsx", import.meta.url),
  "utf8",
);

const preferencesStart = source.indexOf('aria-label={t("nav.preferences", "Preferences")}');
const preferencesEnd = source.indexOf("topbar-menu-button", preferencesStart);
const preferencesMenu = source.slice(preferencesStart, preferencesEnd);

test("UnifiedNav consolidates desktop settings, language, and theme choices into one Preferences menu", () => {
  assert.ok(preferencesStart >= 0);
  assert.ok(preferencesEnd > preferencesStart);
  assert.match(preferencesMenu, /<Link to="\/settings">/);
  assert.match(preferencesMenu, /languages\.map\(\(lang\) =>/);
  assert.match(preferencesMenu, /\["dark", "light", "oled"\] as const/);
  assert.match(preferencesMenu, /onClick=\{\(\) => setTheme\(option\)\}/);
});

test("UnifiedNav keeps focused top-level utilities while removing separate palette and globe header imports", () => {
  assert.match(source, /<NotificationBell \/>/);
  assert.match(source, /<UserProfileDropdown/);
  assert.match(source, /topbar-menu-button/);
  assert.doesNotMatch(source, /icons\/palette/);
  assert.doesNotMatch(source, /icons\/globe/);
});
