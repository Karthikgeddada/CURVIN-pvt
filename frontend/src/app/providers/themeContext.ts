import { createContext } from "react";

export type Theme = "light" | "dark";

/** localStorage key for the persisted theme preference. */
export const STORAGE_KEY = "curvin-theme";

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/** Ambient theme state, provided by ThemeProvider. */
export const ThemeContext = createContext<ThemeContextValue | null>(null);
