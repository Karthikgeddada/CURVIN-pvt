import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { apiClient } from "@/core/api/client";
import { CenteredLayout } from "@/shared/layouts/CenteredLayout";
import type { HealthResponse } from "@/shared/types/api";
import { fadeUp, stagger } from "@/design-system/animations/motion";

/**
 * Foundation entry page. Intentionally restrained: it confirms the
 * application runs, the design tokens render and the API client
 * reaches the backend. Business capabilities arrive in later
 * milestones, each with its own feature module and route.
 */
export function HomePage() {
  const reducedMotion = useReducedMotion();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [reachable, setReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getHealth()
      .then((result) => {
        if (!cancelled) {
          setHealth(result);
          setReachable(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReachable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const variants = reducedMotion ? undefined : { hidden: {}, visible: {} };
  const itemVariants = reducedMotion ? undefined : fadeUp;

  return (
    <CenteredLayout>
      <motion.div
        className="flex flex-col items-center text-center"
        variants={variants ?? stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-8">
          <svg
            viewBox="0 0 32 32"
            className="h-10 w-10"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
          >
            <path d="M22.6 7.6A11 11 0 1 0 25.9 21.4" />
          </svg>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-[32px] font-semibold leading-none tracking-[0.14em]"
        >
          CURVIN
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="mt-4 max-w-xs text-[15px] leading-relaxed text-muted"
        >
          Company intelligence, engineered. The foundation for connected
          business, market, financial and risk insight.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="mt-10 inline-flex items-center gap-2 rounded-full border-hairline bg-subtle px-3.5 py-1.5 text-xs text-muted"
          role="status"
          aria-live="polite"
        >
          <span
            className={
              reachable === null
                ? "h-1.5 w-1.5 rounded-full bg-muted opacity-60"
                : reachable
                  ? "h-1.5 w-1.5 rounded-full bg-success"
                  : "h-1.5 w-1.5 rounded-full bg-danger"
            }
          />
          <span>
            {health
              ? `Backend · ${health.environment}`
              : reachable === null
                ? "Connecting to services…"
                : "Backend unavailable"}
          </span>
        </motion.div>
      </motion.div>
    </CenteredLayout>
  );
}
