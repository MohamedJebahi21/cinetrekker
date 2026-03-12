import { createContext } from 'react';
import type { Theme, ThemeContextValue } from '@/lib/constants';

export type { Theme, ThemeContextValue };

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  toggle: () => {},
});
