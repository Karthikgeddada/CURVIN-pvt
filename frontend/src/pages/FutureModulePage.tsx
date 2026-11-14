import { Link, useLocation } from "react-router";
import { ArrowRight, Clock } from "lucide-react";
import { FUTURE_MODULES } from "@/app/config/navigation";
import { Badge } from "@/shared/components/Badge";
import { Panel } from "@/shared/components/Panel";

/**
 * A planned CURVIN module: a real, designed page that states exactly
 * what the module will deliver — never a fake interface pretending
 * to work today.
 */
export function FutureModulePage() {
  const { pathname } = useLocation();
  const info = FUTURE_MODULES[pathname];

  if (!info) {
    return (
      <Panel title="Module not found">
        <p className="text-[14px] text-muted">
          This module is not part of the current CURVIN plan.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Badge tone="outline">{info.group}</Badge>
          <Badge tone="muted">
            <Clock className="h-3 w-3" aria-hidden="true" />
            Planned module
          </Badge>
        </div>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight">
          {info.title}
        </h1>
        <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-muted">
          {info.description}
        </p>
      </header>

      <Panel title="Planned capabilities">
        <ul className="space-y-2.5">
          {info.capabilities.map((capability) => (
            <li
              key={capability}
              className="flex items-start gap-2.5 text-[13px] leading-relaxed"
            >
              <span
                className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted"
                aria-hidden="true"
              />
              {capability}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-hairline pt-4 text-[12px] leading-relaxed text-muted">
          This module is part of the CURVIN roadmap and is not yet
          implemented. Nothing on this page presents simulated or
          fabricated market data. Meanwhile, company discovery is live:{" "}
          <Link
            to="/companies"
            className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2"
          >
            open Company Search
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </p>
      </Panel>
    </div>
  );
}
