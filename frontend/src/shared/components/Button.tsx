import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/shared/utilities/cn";

/**
 * The foundational CURVIN button. Two restrained variants, full-width
 * not supported by design, motion limited to opacity and transform.
 */
export type ButtonVariant = "primary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:opacity-85 active:opacity-75",
  ghost: "bg-transparent text-foreground hover:bg-subtle",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium tracking-[-0.01em]",
        "transition-opacity duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40",
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
