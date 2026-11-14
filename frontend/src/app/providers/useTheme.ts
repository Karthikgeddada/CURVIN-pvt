import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "@/app/providers/themeContext";

/** Access the ambient theme. Must be used inside ThemeProvider. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
