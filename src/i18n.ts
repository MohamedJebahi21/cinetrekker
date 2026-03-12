import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import ar from "./locales/ar.json";
import fr from "./locales/fr.json";
import tr from "./locales/tr.json";
import es from "./locales/es.json";
import de from "./locales/de.json";

type TranslationTree = Record<string, unknown>;
const MOJIBAKE_PATTERN = /[ÃÂØÙÐ]/;

function sanitizeTranslations(input: TranslationTree): TranslationTree {
  const cleaned: TranslationTree = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      if (!MOJIBAKE_PATTERN.test(value)) {
        cleaned[key] = value;
      }
      continue;
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      cleaned[key] = sanitizeTranslations(value as TranslationTree);
      continue;
    }

    cleaned[key] = value;
  }

  return cleaned;
}

function deepMergeTranslations(
  base: TranslationTree,
  override: TranslationTree,
): TranslationTree {
  const merged: TranslationTree = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const baseValue = merged[key];
    const baseIsObject =
      typeof baseValue === "object" &&
      baseValue !== null &&
      !Array.isArray(baseValue);
    const valueIsObject =
      typeof value === "object" && value !== null && !Array.isArray(value);

    if (baseIsObject && valueIsObject) {
      merged[key] = deepMergeTranslations(
        baseValue as TranslationTree,
        value as TranslationTree,
      );
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

export const languages = [
  { code: "en", name: "English", dir: "ltr" },
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "fr", name: "Français", dir: "ltr" },
  { code: "tr", name: "Türkçe", dir: "ltr" },
  { code: "es", name: "Español", dir: "ltr" },
  { code: "de", name: "Deutsch", dir: "ltr" },
] as const;

export type LanguageCode = (typeof languages)[number]["code"];

const resources = {
  en: { translation: en },
  ar: { translation: deepMergeTranslations(en, sanitizeTranslations(ar)) },
  fr: { translation: deepMergeTranslations(en, sanitizeTranslations(fr)) },
  tr: { translation: deepMergeTranslations(en, sanitizeTranslations(tr)) },
  es: { translation: deepMergeTranslations(en, sanitizeTranslations(es)) },
  de: { translation: deepMergeTranslations(en, sanitizeTranslations(de)) },
};

const isDev = Boolean(
  (typeof import.meta !== "undefined" && import.meta.env?.DEV) ||
  (typeof process !== "undefined" && process.env?.NODE_ENV === "development"),
);
const i18nDebugEnabled =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_I18N_DEBUG === "true") ||
  (typeof process !== "undefined" &&
    process.env?.VITE_I18N_DEBUG === "true");

const warnedMissingKeys = new Set<string>();

function lastSegmentTitleCase(key: string) {
  const seg = key.split(".").pop() || key;
  return seg
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : ""))
    .join(" ");
}

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources,
  debug: i18nDebugEnabled,
  showSupportNotice: false,
  fallbackLng: "en",
  supportedLngs: languages.map((l) => l.code),
  load: "languageOnly",
  nonExplicitSupportedLngs: true,
  returnNull: false,
  returnEmptyString: false,
  returnObjects: true,
  interpolation: {
    escapeValue: false,
  },
  detection: {
    order: ["localStorage", "navigator"],
    caches: ["localStorage"],
  },
  parseMissingKeyHandler: (key) => {
    if (isDev) {
      if (!warnedMissingKeys.has(key)) {
        warnedMissingKeys.add(key);
        console.warn(`[i18n] Missing translation key: ${key}`);
      }
    }
    return lastSegmentTitleCase(key);
  },
});

// Update document direction when language changes
i18n.on("languageChanged", (lng) => {
  const language = languages.find((l) => l.code === lng);
  document.documentElement.dir = language?.dir || "ltr";
  document.documentElement.lang = lng;
});

// Set initial direction
const currentLang = languages.find((l) => l.code === i18n.language);
document.documentElement.dir = currentLang?.dir || "ltr";
document.documentElement.lang = i18n.language;

export default i18n;

