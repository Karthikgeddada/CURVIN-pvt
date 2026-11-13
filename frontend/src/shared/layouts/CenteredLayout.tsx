import type { PropsWithChildren } from "react";

/**
 * A calm, focused layout: content centered on the page with generous
 * whitespace and a hard maximum width for readable proportions.
 */
export function CenteredLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
