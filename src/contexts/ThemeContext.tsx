import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

export type Theme = "dark" | "light" | "oled";

export const THEME_STORAGE_KEY = "cinetrekker-theme";

export type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
};

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggle: () => {},
});

export const THEME_CYCLE: Theme[] = ["dark", "light", "oled"];

export function normalizeTheme(raw: string | null): Theme {
  if (raw === "light" || raw === "oled" || raw === "dark") return raw;
  return "dark";
}

export function readStoredTheme(): Theme {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "dark";
  }
}

export function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme !== "light");
  root.style.colorScheme = theme === "light" ? "light" : "dark";
}

export const useTheme = () => useContext(ThemeContext);

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
