/**
 * Typed access to CURVIN design tokens.
 * The values live in src/styles/global.css as CSS custom properties
 * (light and dark schemes); this module is the single source that
 * components import when they need a token programmatically. Never
 * hard-code colors, durations or type sizes — reference a token.
 */
export const tokens = {
  color: {
    background: "var(--color-background)",
    foreground: "var(--color-foreground)",
    muted: "var(--color-muted)",
    subtle: "var(--color-subtle)",
    hairline: "var(--color-hairline)",
    accent: "var(--color-accent)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    danger: "var(--color-danger)",
  },
  duration: {
    /** Standard UI transition. */
    fast: "200ms",
    /** Deliberate, scene-level transition. */
    deliberate: "420ms",
  },
  easing: {
    /** Apple-style ease-out curve for entrances. */
    standard: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  },
} as const;
