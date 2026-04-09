const FONT_SIZE_KEY = "cinetrekker_font_size";
const REDUCE_MOTION_KEY = "cinetrekker_reduce_motion";
const MOTION_INTENSITY_KEY = "cinetrekker_motion_intensity";
const LEGACY_HIGH_CONTRAST_KEY = "cinetrekker_high_contrast";

const DEFAULT_FONT_SIZE = 100;
const MIN_FONT_SIZE = 80;
const MAX_FONT_SIZE = 150;
const DEFAULT_MOTION_INTENSITY: MotionIntensity = "medium";

export type MotionIntensity = "low" | "medium" | "high";

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

function parseStoredMotionIntensity(raw: string | null): MotionIntensity {
  if (raw === "low" || raw === "high" || raw === "medium") {
    return raw;
  }
  return DEFAULT_MOTION_INTENSITY;
}

function emitAccessibilityPreferenceUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("cinetrekker:accessibility-updated"));
}

export function readAccessibilityPreferences() {
  try {
    return {
      fontSize: parseStoredFontSize(localStorage.getItem(FONT_SIZE_KEY)),
      reduceMotion: parseStoredBoolean(localStorage.getItem(REDUCE_MOTION_KEY)),
      motionIntensity: parseStoredMotionIntensity(localStorage.getItem(MOTION_INTENSITY_KEY)),
    };
  } catch {
    return {
      fontSize: DEFAULT_FONT_SIZE,
      reduceMotion: false,
      motionIntensity: DEFAULT_MOTION_INTENSITY,
    };
  }
}

export function readMotionIntensityPreference(): MotionIntensity {
  return readAccessibilityPreferences().motionIntensity;
}

export function applyAccessibilityPreferencesToRoot() {
  if (typeof document === "undefined") return;
  const { fontSize, reduceMotion, motionIntensity } = readAccessibilityPreferences();
  const root = document.documentElement;

  root.style.fontSize = `${fontSize}%`;
  root.classList.remove("high-contrast");
  root.classList.toggle("reduce-motion", reduceMotion);
  root.dataset.motionIntensity = motionIntensity;
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
  emitAccessibilityPreferenceUpdate();
  return clamped;
}

export function saveReduceMotionPreference(value: boolean) {
  try {
    localStorage.setItem(REDUCE_MOTION_KEY, String(value));
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
  emitAccessibilityPreferenceUpdate();
}

export function saveMotionIntensityPreference(value: MotionIntensity): MotionIntensity {
  const normalized = parseStoredMotionIntensity(value);
  try {
    localStorage.setItem(MOTION_INTENSITY_KEY, normalized);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
  emitAccessibilityPreferenceUpdate();
  return normalized;
}

export const accessibilityPreferenceKeys = {
  fontSize: FONT_SIZE_KEY,
  reduceMotion: REDUCE_MOTION_KEY,
  motionIntensity: MOTION_INTENSITY_KEY,
};
