import type { PropsWithChildren } from "react";
import { cn } from "@/shared/utilities/cn";

export type BadgeTone = "neutral" | "up" | "down" | "muted" | "outline";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-subtle text-foreground",
  up: "bg-subtle text-change-up",
  down: "bg-subtle text-change-down",
  muted: "bg-subtle text-muted",
  outline: "border border-hairline text-muted",
};

/** Small, quiet label used for statuses, sources and filters. */
export function Badge({
  tone = "neutral",
  className,
  children,
}: PropsWithChildren<{ tone?: BadgeTone; className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 tracking-wide",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
