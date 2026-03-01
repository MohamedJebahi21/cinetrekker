import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import ar from "./locales/ar.json";
import fr from "./locales/fr.json";
import tr from "./locales/tr.json";
import es from "./locales/es.json";
import de from "./locales/de.json";

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
  ar: { translation: ar },
  fr: { translation: fr },
  tr: { translation: tr },
  es: { translation: es },
  de: { translation: de },
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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
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
