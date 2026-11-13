import type { PropsWithChildren } from "react";

/**
 * Single place to compose application-wide providers (theme, data,
 * auth session, toasts). Intentionally minimal until a real provider
 * is introduced — every capability added later is wired here, never
 * ad hoc in components.
 */
export function AppProviders({ children }: PropsWithChildren) {
  return <>{children}</>;
}
