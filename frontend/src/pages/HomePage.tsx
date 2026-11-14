import { Link } from "react-router";
import { ArrowRight, Database, Search } from "lucide-react";
import { Badge } from "@/shared/components/Badge";
import { Panel } from "@/shared/components/Panel";

const LIVE_MODULES = [
  {
    title: "Company Discovery",
    body: "Search every US-listed company by name or ticker; filter by exchange and listing status.",
    to: "/companies",
    cta: "Open search",
  },
  {
    title: "Company Directory",
    body: "Browse the full reference universe, page by page, with verified exchange listings.",
    to: "/companies/directory",
    cta: "Browse directory",
  },
  {
    title: "Company Profiles",
    body: "Verified identity, business profile and listing status for any company you research.",
    to: "/companies/profiles",
    cta: "View profiles",
  },
];

/**
 * Market Intelligence Overview — the CURVIN landing surface. It
 * states clearly what is live today, what is planned next, and never
 * shows simulated market numbers.
 */
export function HomePage() {
  return (
    <div className="space-y-8">
      <section>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
          CURVIN · Market Intelligence Overview
        </p>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight">
          Institutional-grade market intelligence, engineered end to end.
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">
          CURVIN unifies company discovery, market, institutional, sector and
          risk intelligence into one governed platform. Milestone 1 ships
          the application workspace with live company discovery on verified
          reference data.
        </p>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <Badge tone="up">Company discovery · live</Badge>
        <Badge tone="outline">Market data · next milestone</Badge>
        <Badge tone="muted">Institutional · sector · risk · AI · roadmap</Badge>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {LIVE_MODULES.map((module) => (
          <Panel key={module.title} title={module.title}>
            <p className="min-h-[60px] text-[13px] leading-relaxed text-muted">
              {module.body}
            </p>
            <Link
              to={module.to}
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium underline underline-offset-4 transition-colors hover:text-accent"
            >
              {module.cta}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Panel>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Panel
          title="Find a company"
          subtitle="The fastest path into CURVIN research"
          actions={
            <kbd className="rounded bg-subtle px-1.5 py-0.5 text-[11px] text-muted">
              /
            </kbd>
          }
        >
          <p className="text-[13px] leading-relaxed text-muted">
            Press / anywhere, or start typing a name like “NVIDIA” or a
            ticker like “NVDA”. Results come from the live company reference
            API — every listing shows its exchange, sector, industry and
            status.
          </p>
          <Link
            to="/companies"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-hairline px-4 py-2 text-[13px] font-medium transition-colors hover:border-foreground/30"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Search companies
          </Link>
        </Panel>

        <Panel
          title="Data foundation"
          subtitle="What powers CURVIN today — and what comes next"
        >
          <ul className="space-y-3 text-[13px] leading-relaxed">
            <li className="flex items-start gap-2.5">
              <Database
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-change-up"
                aria-hidden="true"
              />
              <span>
                <span className="font-medium">
                  Company reference data — live.
                </span>{" "}
                SEC EDGAR-backed US listings with deterministic fixtures as
                automatic fallback, so discovery never silently breaks.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Database
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted"
                aria-hidden="true"
              />
              <span>
                <span className="font-medium">Market data — next.</span>{" "}
                Quotes, indices and market breadth arrive with the licensed
                market data provider in the next milestone.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Database
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted"
                aria-hidden="true"
              />
              <span>
                <span className="font-medium">Fundamentals — planned.</span>{" "}
                Financial statements keyed by CIK from the same governed
                reference data.
              </span>
            </li>
          </ul>
        </Panel>
      </section>
    </div>
  );
}

