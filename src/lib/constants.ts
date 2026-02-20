/**
 * Application constants and types
 * Separated from components to satisfy React Fast Refresh rules
 */

// Theme constants
export const THEME_KEY = 'cinetrekker:theme';
export const TRANSITION_STYLE_ID = 'cinetrekker-theme-transition-style';
export const TRANSITION_CLASS = 'cinetrekker-theme-transition';
export const TRANSITION_MS = 300;

// Theme types
export type Theme = 'light' | 'dark';

export type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

// Toast/Sonner constants (if any needed in future)
export const TOAST_DEFAULTS = {
  duration: 3000,
  position: 'bottom-right' as const,
} as const;
