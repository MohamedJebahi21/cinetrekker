import { createContext, useContext, useLayoutEffect } from "react";

type Theme = "dark";
const ThemeContext = createContext<{theme: Theme}>({theme: "dark"});

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

  return <ThemeContext.Provider value={{theme: "dark"}}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
