import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "@/shared/utilities/cn";

/**
 * The standard content surface: one quiet card with an optional
 * header (title, subtitle, actions). Content density comes from
 * the children, not decoration.
 */
export function Panel({
  title,
  subtitle,
  actions,
  className,
  bodyClassName,
  children,
}: PropsWithChildren<{
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
}>) {
  return (
    <section
      className={cn(
        "rounded-xl border border-hairline bg-surface",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div>
            {title && (
              <h2 className="text-[13px] font-semibold tracking-wide">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}
