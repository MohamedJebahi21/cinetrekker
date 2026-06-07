import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const ThemeContext = createContext<{theme: Theme, toggle: () => void}>({theme: "light", toggle: () => {}});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "light");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);
  const toggle = () => setTheme(t => (t === "light" ? "dark" : "light"));
  return <ThemeContext.Provider value={{theme, toggle}}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
