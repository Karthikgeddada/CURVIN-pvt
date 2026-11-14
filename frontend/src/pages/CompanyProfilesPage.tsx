import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useRecentCompanies } from "@/features/companies/hooks/useRecentCompanies";
import { Panel } from "@/shared/components/Panel";
import { EmptyState } from "@/shared/components/StateViews";

/**
 * Entry point for company profiles: what a CURVIN profile contains,
 * where profiles come from, and quick access to recent research.
 */
export function CompanyProfilesPage() {
  const { recents } = useRecentCompanies();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Company Profiles
        </h1>
        <p className="mt-1 text-[14px] text-muted">
          Verified company reference information — identity, listing and
          business profile — for every company in the discovery universe.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Verified identity",
            body: "Official company name, ticker, exchange, CIK, share class and listing status — sourced from the reference provider, never inferred.",
          },
          {
            title: "Business profile",
            body: "Sector, industry, headquarters, employee count and description where the reference data provides them.",
          },
          {
            title: "Market & fundamentals (planned)",
            body: "Quotes and financial fundamentals arrive with the market data provider configuration in a later milestone.",
          },
        ].map((card) => (
          <Panel key={card.title} title={card.title}>
            <p className="text-[13px] leading-relaxed text-muted">{card.body}</p>
          </Panel>
        ))}
      </div>

      <Panel title="Open a profile" subtitle="From search or your recent research">
        {recents.length === 0 ? (
          <EmptyState
            title="No recent profiles yet"
            hint={
              <span>
                Open any company from{" "}
                <Link to="/companies" className="underline underline-offset-2">
                  Company Search
                </Link>{" "}
                and it will appear here.
              </span>
            }
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {recents.slice(0, 6).map((company) => (
              <li key={company.ticker}>
                <Link
                  to={`/companies/${encodeURIComponent(company.ticker)}`}
                  className="flex items-center gap-3 px-0 py-2.5 text-[13px] transition-colors hover:text-accent"
                >
                  <span className="w-16 font-mono font-medium">
                    {company.ticker}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{company.name}</span>
                  <span className="text-[12px] text-muted">{company.exchange}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
