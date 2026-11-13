import type { Transition, Variants } from "motion/react";

/**
 * Shared motion vocabulary. Purposeful, short, interruptible —
 * entrances only, no looping or decorative motion. Components pair
 * these with useReducedMotion so users who prefer reduced motion get
 * static states.
 */
export const easeOutExpo: Transition = {
  duration: 0.5,
  ease: [0.16, 1, 0.3, 1],
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: easeOutExpo },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeOutExpo },
};

/** Container that staggers its children slightly, never mechanically. */
export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
