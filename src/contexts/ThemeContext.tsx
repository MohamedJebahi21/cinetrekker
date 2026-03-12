import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  applyThemeToDocument,
  readStoredTheme,
  THEME_CYCLE,
  THEME_STORAGE_KEY,
  Theme,
  ThemeContext,
} from "@/contexts/theme-context";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return readStoredTheme();
  });

  useLayoutEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures.
    }
  }, [theme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      setThemeState(readStoredTheme());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo(() => {
    const setTheme = (nextTheme: Theme) => setThemeState(nextTheme);
    const toggle = () => {
      setThemeState((prev) => {
        const currentIndex = THEME_CYCLE.indexOf(prev);
        return THEME_CYCLE[(currentIndex + 1) % THEME_CYCLE.length];
      });
    };

    return {
      theme,
      setTheme,
      toggle,
    };
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
