import { useLayoutEffect } from "react";
import { ThemeContext } from '@/contexts/theme-context';

export type Theme = "dark";

export function readStoredTheme(): Theme {
  return "dark";
}

export function applyThemeToDocument(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    try {
      // Force dark mode - clear any stored theme preferences
      localStorage.removeItem('theme');
      localStorage.removeItem('cinetrekker:theme');
      
      // Ensure dark class is applied
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    } catch (e) {
      // ignore (SSR or restricted storage)
    }
  }, []);

  return <ThemeContext.Provider value={{ theme: "dark" }}>{children}</ThemeContext.Provider>;
}

export { useTheme } from '@/contexts/theme-context';
