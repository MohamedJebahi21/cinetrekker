import { createContext, useContext } from "react";

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

export { ThemeProvider } from "@/contexts/ThemeContext";

