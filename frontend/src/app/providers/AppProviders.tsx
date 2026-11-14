import type { PropsWithChildren } from "react";
import { ThemeProvider } from "@/app/providers/ThemeProvider";

/**
 * Single place to compose application-wide providers. Every capability
 * added later is wired here, never ad hoc in components.
 */
export function AppProviders({ children }: PropsWithChildren) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
