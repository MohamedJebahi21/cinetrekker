import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ar from './locales/ar.json';
import fr from './locales/fr.json';
import tr from './locales/tr.json';
import es from './locales/es.json';
import de from './locales/de.json';

export const languages = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  fr: { translation: fr },
  tr: { translation: tr },
  es: { translation: es },
  de: { translation: de },
};

const isDev = (typeof import.meta !== 'undefined' && (import.meta as Record<string, unknown>).env?.DEV) || process.env.NODE_ENV !== 'production';

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
  const seg = key.split('.').pop() || key;
  return seg
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : ''))
    .join(' ');
}

i18n
  .use(i18nLogger)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: languages.map(l => l.code),
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    returnNull: false,
    returnEmptyString: false,
    returnObjects: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    parseMissingKeyHandler: (key) => {
      if (isDev) {
        console.warn(`[i18n] Missing translation key: ${key}`);
      }
      return lastSegmentTitleCase(key);
    },
  });

// Update document direction when language changes
i18n.on('languageChanged', (lng) => {
  const language = languages.find(l => l.code === lng);
  document.documentElement.dir = language?.dir || 'ltr';
  document.documentElement.lang = lng;
});

// Set initial direction
const currentLang = languages.find(l => l.code === i18n.language);
document.documentElement.dir = currentLang?.dir || 'ltr';
document.documentElement.lang = i18n.language;

export default i18n;
