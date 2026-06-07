import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";

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
};

const localeLoaders = {
  ar: () => import("./locales/ar.json"),
  fr: () => import("./locales/fr.json"),
  tr: () => import("./locales/tr.json"),
  es: () => import("./locales/es.json"),
  de: () => import("./locales/de.json"),
} as const satisfies Partial<Record<Exclude<LanguageCode, "en">, () => Promise<{ default: Record<string, string> }>>>;

const loadedLanguages = new Set<LanguageCode>(["en"]);

async function ensureLanguageResources(language: LanguageCode) {
  if (loadedLanguages.has(language) || language === "en") {
    return;
  }

  const loader = localeLoaders[language as keyof typeof localeLoaders];
  if (!loader) {
    loadedLanguages.add(language);
    return;
  }

  const module = await loader();
  i18n.addResourceBundle(language, "translation", module.default, true, true);
  loadedLanguages.add(language);
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

// Custom logger that suppresses the i18next locize advertisement
const LOCIZE_AD_PREFIX = '🌐 i18next is maintained with support from Locize';
const i18nLogger = {
  type: 'logger' as const,
  log(...args: unknown[]) {
    if (args.some((a) => typeof a === 'string' && a.startsWith(LOCIZE_AD_PREFIX))) return;
    if (isDev) console.log(...args);
  },
  warn(...args: unknown[]) { if (isDev) console.warn(...args); },
  error(...args: unknown[]) { console.error(...args); },
};

function lastSegmentTitleCase(key: string) {
  const seg = key.split(".").pop() || key;
  return seg
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : ""))
    .join(" ");
}

i18n
  .use(i18nLogger)
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

const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = (async (language?: string, ...args: unknown[]) => {
  const nextLanguage = (language || "en") as LanguageCode;
  await ensureLanguageResources(nextLanguage);
  return originalChangeLanguage(nextLanguage, ...(args as []));
}) as typeof i18n.changeLanguage;

if (i18n.language !== "en") {
  void i18n.changeLanguage(i18n.language);
}

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
