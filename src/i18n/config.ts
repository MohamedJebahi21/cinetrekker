import i18n, { InitOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';

const isDev = (typeof import.meta !== 'undefined' && (import.meta as Record<string, unknown>).env?.DEV) || process.env.NODE_ENV !== 'production';

function lastSegmentTitleCase(key: string) {
  const seg = key.split('.').pop() || key;
  return seg
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : ''))
    .join(' ');
}

export const defaultI18nOptions: InitOptions = {
  resources: {
    en: { translation: en as Record<string, unknown> },
  },
  fallbackLng: 'en',
  debug: Boolean(isDev),
  ns: ['translation'],
  defaultNS: 'translation',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  parseMissingKeyHandler: (key: string) => {
    if (isDev) {
      // Log missing keys only in development
      console.warn(`[i18n] Missing translation key: ${key}`);
    }
    
    // Enhanced fallback with better user-friendly strings
    const fallbackMap: Record<string, string> = {
      'home.topThisWeek': 'Top This Week',
      'home.topMoviesWeek': 'Top Movies This Week',
      'home.topSeriesWeek': 'Top TV Shows This Week',
      'home.trendingToday': 'Trending Today',
      'home.trendingWeek': 'Trending This Week',
    };
    
    return fallbackMap[key] || lastSegmentTitleCase(key);
  },
  returnEmptyString: false,
  returnObjects: true,
};

export function initI18n(options?: Partial<InitOptions>) {
  const initOpts: InitOptions = { ...defaultI18nOptions, ...(options || {}) };
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init(initOpts).catch((err) => {
      if (isDev) {
        console.error('[i18n] Initialization failed; falling back to embedded English', err);
      }
      try {
        i18n.init(defaultI18nOptions);
      } catch (fallbackError) {
        void fallbackError;
      }
    });
  }
  return i18n;
}

export default initI18n;

declare module 'react-i18next' {
  type EN = typeof import('../locales/en.json');
  interface CustomTypeOptions {
    resources: EN;
  }
}
