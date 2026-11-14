import { cn } from "@/shared/utilities/cn";

/** Neutral loading block — no shimmer, no motion. Height via className. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-subtle", className)}
    />
  );
}
