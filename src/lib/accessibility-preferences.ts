const FONT_SIZE_KEY = "cinetrekker_font_size";
const REDUCE_MOTION_KEY = "cinetrekker_reduce_motion";
const LEGACY_HIGH_CONTRAST_KEY = "cinetrekker_high_contrast";

const DEFAULT_FONT_SIZE = 100;
const MIN_FONT_SIZE = 80;
const MAX_FONT_SIZE = 150;

function clampFontSize(value: number): number {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, value));
}

function parseStoredFontSize(raw: string | null): number {
  if (!raw) return DEFAULT_FONT_SIZE;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_FONT_SIZE;
  return clampFontSize(parsed);
}

function parseStoredBoolean(raw: string | null): boolean {
  return raw === "true";
}

export function readAccessibilityPreferences() {
  try {
    return {
      fontSize: parseStoredFontSize(localStorage.getItem(FONT_SIZE_KEY)),
      reduceMotion: parseStoredBoolean(localStorage.getItem(REDUCE_MOTION_KEY)),
    };
  } catch {
    return {
      fontSize: DEFAULT_FONT_SIZE,
      reduceMotion: false,
    };
  }
}

export function applyAccessibilityPreferencesToRoot() {
  if (typeof document === "undefined") return;
  const { fontSize, reduceMotion } = readAccessibilityPreferences();
  const root = document.documentElement;

  root.style.fontSize = `${fontSize}%`;
  root.classList.remove("high-contrast");
  root.classList.toggle("reduce-motion", reduceMotion);
  try {
    localStorage.removeItem(LEGACY_HIGH_CONTRAST_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function saveFontSizePreference(value: number): number {
  const clamped = clampFontSize(value);
  try {
    localStorage.setItem(FONT_SIZE_KEY, String(clamped));
  } catch {
    // Ignore storage failures (private mode, quota, etc.) and still apply in-memory value.
  }
  return clamped;
}

export function saveReduceMotionPreference(value: boolean) {
  try {
    localStorage.setItem(REDUCE_MOTION_KEY, String(value));
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export const accessibilityPreferenceKeys = {
  fontSize: FONT_SIZE_KEY,
  reduceMotion: REDUCE_MOTION_KEY,
};
