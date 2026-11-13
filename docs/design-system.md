# Design System

## Principles

1. **Calm and quiet.** The interface recedes; content and data lead.
2. **Deliberate.** Motion is purposeful, short and interruptible —
   entrances only, never looping or decorative.
3. **Restrained.** Two button variants, semantic color tokens, no
   arbitrary values. Components do one thing.
4. **Accessible.** Visible focus states, respectful of
   `prefers-reduced-motion` and `prefers-color-scheme`.

## Tokens

Defined once as CSS custom properties in
`frontend/src/styles/global.css` (light and dark schemes) and exposed
to Tailwind via `@theme inline`:

| Token | Purpose |
| --- | --- |
| `background` / `foreground` | Page surface and text |
| `muted` | Secondary text |
| `subtle` | Quiet fills (badges, wells) |
| `hairline` | 1px separators and borders |
| `accent` / `accent-foreground` | Primary action and its text |
| `success` / `warning` / `danger` | Status semantics |

Programmatic access: `frontend/src/design-system/tokens/tokens.ts`.
Never hard-code colors or durations — reference a token.

## Motion

Shared vocabulary in `frontend/src/design-system/animations/motion.ts`:
`fadeUp`, `fadeIn`, `stagger`, all on an ease-out-expo curve (~500ms).
Components pair these with `useReducedMotion` and fall back to static
states.

## Type

System font stack (`-apple-system` → Inter → system-ui), antialiased.
Headlines are semibold with optical tracking; body text is 15px,
relaxed leading.

## Components

- `Button` — `primary` and `ghost` variants; pill shape; motion limited
  to opacity.
- `CenteredLayout` — focused, readable single-column surface.

New shared components join `src/shared/components` only once at least
  two features need them.
