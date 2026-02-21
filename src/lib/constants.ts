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

// Common strings blocklist (top 100+ most common weak credentials)
// This list catches the most frequently used weak choices
export const COMMON_STRINGS = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789',
  '1234567890', 'qwerty', 'qwerty123', 'abc123', 'monkey', 'letmein',
  'dragon', 'master', 'login', 'welcome', 'princess', 'admin', 'admin123',
  'sunshine', 'shadow', 'football', 'baseball', 'iloveyou', 'trustno1',
  'superman', 'batman', 'starwars', 'hello', 'freedom', 'whatever',
  'qazwsx', 'michael', 'jennifer', 'hunter', 'amanda', 'jessica', 'joshua',
  'andrew', 'ashley', 'daniel', 'charlie', 'thomas', 'computer', 'internet',
  'server', 'changeme', 'passw0rd', 'p@ssword', 'p@ssw0rd', 'pass1234',
  '1qaz2wsx', 'zaq12wsx', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234qwer',
  'password!', 'password@', 'password#', 'Password1', 'Password1!', 'Password123',
  'access', 'power', 'killer', 'magic', 'summer', 'winter', 'spring',
  'autumn', 'letmein1', 'welcome1', 'qwerty12', 'abc12345', 'pass', 'passwd',
  '7777777', '1q2w3e4r', '123qwe', 'test', 'test123', 'testing', 'guest',
  'root', 'toor', 'secret', 'password0', 'love', 'god', 'sex', 'money',
  'qwerty1', 'abc1234', '12345', '123123', '111111', '000000', '654321',
]);
