import React, { createContext, useLayoutEffect, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  toggle: () => {},
});

const THEME_KEY = 'cinetrekker:theme';
const TRANSITION_STYLE_ID = 'cinetrekker-theme-transition-style';
const TRANSITION_CLASS = 'cinetrekker-theme-transition';
const TRANSITION_MS = 300;

function injectTransitionStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(TRANSITION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = TRANSITION_STYLE_ID;
  style.textContent = `
    .${TRANSITION_CLASS} {
      transition: background-color ${TRANSITION_MS}ms ease, color ${TRANSITION_MS}ms ease, border-color ${TRANSITION_MS}ms ease, fill ${TRANSITION_MS}ms ease, stroke ${TRANSITION_MS}ms ease;
    }
  `;
  document.head.appendChild(style);
}

function applyThemeClass(theme: Theme) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  if (theme === 'dark') el.classList.add('dark');
  else el.classList.remove('dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    injectTransitionStyle();

    try {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      const prefersDark =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

      const initial: Theme = (stored as Theme) || (prefersDark ? 'dark' : 'light');
      setThemeState(initial);
      applyThemeClass(initial);
    } catch {
      applyThemeClass('light');
      setThemeState('light');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        const newTheme = e.newValue as Theme;
        setThemeState(newTheme);
        applyThemeClass(newTheme);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = (t: Theme) => {
    if (typeof window === 'undefined') {
      setThemeState(t);
      return;
    }
    const el = document.documentElement;
    el.classList.add(TRANSITION_CLASS);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // ignore
    }
    applyThemeClass(t);
    setThemeState(t);
    window.setTimeout(() => el.classList.remove(TRANSITION_CLASS), TRANSITION_MS + 20);
  };

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
