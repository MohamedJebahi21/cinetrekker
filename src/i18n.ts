import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";

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

const localeLoaders: Record<
  Exclude<LanguageCode, "en">,
  () => Promise<{ default: TranslationTree }>
> = {
  ar: () => import("./locales/ar.json"),
  fr: () => import("./locales/fr.json"),
  tr: () => import("./locales/tr.json"),
  es: () => import("./locales/es.json"),
  de: () => import("./locales/de.json"),
};

const loadedLocales = new Set<LanguageCode>(["en"]);

async function buildLocaleTranslation(
  code: LanguageCode,
): Promise<TranslationTree> {
  if (code === "en") {
    return en;
  }

  const module = await localeLoaders[code]();
  return deepMergeTranslations(en, sanitizeTranslations(module.default));
}

function normalizeLanguageCode(value: string | undefined): LanguageCode {
  const normalized = value?.split("-")[0]?.toLowerCase();
  const match = languages.find((language) => language.code === normalized);
  return match?.code ?? "en";
}

function readStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") {
    return "en";
  }

  return normalizeLanguageCode(window.localStorage.getItem("i18nextLng") ?? undefined);
}

function applyDocumentLanguage(lng: string) {
  const language = languages.find((entry) => entry.code === lng);
  document.documentElement.dir = language?.dir || "ltr";
  document.documentElement.lang = lng;
}

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

async function ensureLanguageLoaded(code: LanguageCode) {
  if (loadedLocales.has(code)) {
    return;
  }

  const translation = await buildLocaleTranslation(code);
  i18n.addResourceBundle(code, "translation", translation, true, true);
  loadedLocales.add(code);
}

export async function changeLanguage(value: string) {
  const code = normalizeLanguageCode(value);
  await ensureLanguageLoaded(code);
  await i18n.changeLanguage(code);
}

export async function initI18n() {
  const initialLanguage = readStoredLanguage();
  const resources: Record<string, { translation: TranslationTree }> = {
    en: { translation: en },
  };

  if (initialLanguage !== "en") {
    resources[initialLanguage] = {
      translation: await buildLocaleTranslation(initialLanguage),
    };
    loadedLocales.add(initialLanguage);
  }

  await i18n.use(LanguageDetector).use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    debug: i18nDebugEnabled,
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
    parseMissingKeyHandler: i18nDebugEnabled
      ? (key) => {
          if (isDev && !warnedMissingKeys.has(key)) {
            warnedMissingKeys.add(key);
            console.warn(`[i18n] Missing translation key: ${key}`);
          }
          return lastSegmentTitleCase(key);
        }
      : undefined,
  });

  i18n.on("languageChanged", (lng) => {
    const code = normalizeLanguageCode(lng);
    applyDocumentLanguage(code);
  });

  applyDocumentLanguage(i18n.language);
}

export default i18n;
