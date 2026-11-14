import { Link } from "react-router";
import { ArrowRight, Clock } from "lucide-react";
import { useRecentCompanies } from "@/features/companies/hooks/useRecentCompanies";
import { Button } from "@/shared/components/Button";
import { Panel } from "@/shared/components/Panel";
import { EmptyState } from "@/shared/components/StateViews";

/**
 * Recently viewed companies, tracked locally in this workspace.
 * Server-side research history arrives with accounts in a later
 * milestone — this page is honest about that boundary.
 */
export function RecentCompaniesPage() {
  const { recents, clearRecents } = useRecentCompanies();

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Recently Viewed Companies
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            Companies you have opened in this workspace, most recent first.
          </p>
        </div>
        {recents.length > 0 && (
          <Button variant="ghost" onClick={clearRecents}>
            Clear history
          </Button>
        )}
      </header>

      <Panel>
        {recents.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            hint={
              <span>
                Search for a company — for example{" "}
                <Link to="/companies?q=NVDA" className="underline underline-offset-2">
                  NVDA
                </Link>{" "}
                — and open its profile to start your research history.
              </span>
            }
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {recents.map((company) => (
              <li key={company.ticker}>
                <Link
                  to={`/companies/${encodeURIComponent(company.ticker)}`}
                  className="flex items-center gap-3 py-2.5 text-[13px] transition-colors hover:text-accent"
                >
                  <span className="w-20 font-mono font-medium">
                    {company.ticker}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{company.name}</span>
                  <span className="hidden text-[12px] text-muted sm:inline">
                    {company.exchange}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {new Date(company.viewed_at).toLocaleDateString()}
                  </span>
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
