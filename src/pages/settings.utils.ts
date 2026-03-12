export type SettingsState = {
  showWatchlist: boolean;
  showStats: boolean;
  allowRecommendations: boolean;
};

type StoredProfileShape = {
  settings?: Partial<SettingsState>;
};

export function normalizeSettingsState(
  candidate: Partial<SettingsState> | null | undefined,
  fallback: SettingsState,
): SettingsState {
  if (!candidate || typeof candidate !== "object") return fallback;
  return {
    showWatchlist:
      typeof candidate.showWatchlist === "boolean"
        ? candidate.showWatchlist
        : fallback.showWatchlist,
    showStats:
      typeof candidate.showStats === "boolean"
        ? candidate.showStats
        : fallback.showStats,
    allowRecommendations:
      typeof candidate.allowRecommendations === "boolean"
        ? candidate.allowRecommendations
        : fallback.allowRecommendations,
  };
}

export function readStoredSettings(
  raw: string | null,
  fallback: SettingsState,
): SettingsState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredProfileShape;
    return normalizeSettingsState(parsed.settings, fallback);
  } catch {
    return null;
  }
}

export function readStoredProfileData(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function hasSettingsChanged(
  initial: SettingsState,
  current: SettingsState,
): boolean {
  return (
    initial.showWatchlist !== current.showWatchlist ||
    initial.showStats !== current.showStats ||
    initial.allowRecommendations !== current.allowRecommendations
  );
}

export function shouldHandleAccessibilityShortcutKey(key: string): boolean {
  return key === "Enter" || key === " ";
}
