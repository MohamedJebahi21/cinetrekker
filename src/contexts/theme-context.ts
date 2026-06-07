import { createContext, useContext } from 'react';

export type Theme = 'dark';

export const ThemeContext = createContext<{ theme: Theme }>({ theme: 'dark' });

export const useTheme = () => useContext(ThemeContext);

export { ThemeProvider } from '@/contexts/ThemeContext';
