import { expect, test } from "@playwright/test";
import {
  hasSettingsChanged,
  normalizeSettingsState,
  readStoredProfileData,
  readStoredSettings,
  shouldHandleAccessibilityShortcutKey,
  type SettingsState,
} from "../src/pages/settings.utils";

const DEFAULT_SETTINGS: SettingsState = {
  showWatchlist: true,
  showStats: true,
  allowRecommendations: true,
};

test.describe("settings utils", () => {
  test("loaded settings snapshot is not marked as changed", () => {
    const loaded = normalizeSettingsState(
      {
        showWatchlist: false,
        showStats: true,
        allowRecommendations: false,
      },
      DEFAULT_SETTINGS,
    );

    expect(hasSettingsChanged(loaded, loaded)).toBe(false);
  });

  test("changed settings are detected for sticky save bar behavior", () => {
    const initial: SettingsState = {
      showWatchlist: true,
      showStats: false,
      allowRecommendations: true,
    };

    const next: SettingsState = {
      ...initial,
      showStats: true,
    };

    expect(hasSettingsChanged(initial, next)).toBe(true);
  });

  test("storage parsing is resilient for corrupted JSON", () => {
    expect(readStoredSettings("{not-json", DEFAULT_SETTINGS)).toBeNull();
    expect(readStoredProfileData("{not-json")).toEqual({});
  });

  test("accessibility shortcut handler supports Enter and Space", () => {
    expect(shouldHandleAccessibilityShortcutKey("Enter")).toBe(true);
    expect(shouldHandleAccessibilityShortcutKey(" ")).toBe(true);
    expect(shouldHandleAccessibilityShortcutKey("Tab")).toBe(false);
  });
});
