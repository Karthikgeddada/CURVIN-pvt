import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { apiClient } from "@/core/api/client";
import { Badge } from "@/shared/components/Badge";
import { Panel } from "@/shared/components/Panel";
import { Skeleton } from "@/shared/components/Skeleton";
import { EmptyState, ErrorState } from "@/shared/components/StateViews";
import { useCompanySearch } from "@/features/companies/hooks/useCompanySearch";
import { cn } from "@/shared/utilities/cn";
import type { CompanySummary, ExchangeInfo } from "@/shared/types/company";

const RECENT_KEY = "curvin-recent-searches";
const DEBOUNCE_MS = 300;
const PAGE_SIZE = 25;

function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function statusTone(status: CompanySummary["status"]) {
  if (status === "active") return "up" as const;
  if (status === "inactive") return "down" as const;
  return "muted" as const;
}

function ResultRow({ company }: { company: CompanySummary }) {
  return (
    <li className="border-b border-hairline last:border-b-0">
      <Link
        to={`/companies/${encodeURIComponent(company.ticker)}`}
        className="grid grid-cols-[minmax(0,2.2fr)_72px_repeat(2,minmax(0,1fr))_88px] items-center gap-3 px-5 py-3 transition-colors hover:bg-subtle/60 md:grid-cols-[minmax(0,2.2fr)_80px_repeat(3,minmax(0,1fr))_88px]"
      >
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium">
            {company.name}
          </span>
          <span className="block truncate text-[11px] text-muted">
            {company.cik ? `CIK ${company.cik}` : "CIK not available"}
          </span>
        </span>
        <span className="font-mono text-[13px] font-medium tracking-tight">
          {company.ticker}
        </span>
        <span className="truncate text-[12px] text-muted">{company.exchange}</span>
        <span className="hidden truncate text-[12px] text-muted md:block">
          {company.sector ?? "—"}
        </span>
        <span className="hidden truncate text-[12px] text-muted md:block">
          {company.industry ?? "—"}
        </span>
        <span className="justify-self-end">
          <Badge tone={statusTone(company.status)}>
            {company.status === "unknown" ? "unknown" : company.status}
          </Badge>
        </span>
      </Link>
    </li>
  );
}

/**
 * The complete company discovery surface — debounced search, exchange
 * and status filters, paginated results and every state in between.
 * Shared by the search page and the directory (browse) page.
 */
export function CompanySearchView({ mode }: { mode: "search" | "directory" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const exchange = searchParams.get("exchange") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);

  const [input, setInput] = useState(q);
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const [exchanges, setExchanges] = useState<ExchangeInfo[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the text field in sync when the URL changes (back/forward).
  useEffect(() => setInput(q), [q]);

  // Debounce the raw input into the q URL parameter.
  useEffect(() => {
    if (input === q) return;
    const timer = window.setTimeout(() => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (input) next.set("q", input);
          else next.delete("q");
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input, q, setSearchParams]);

  // Load the exchange list once for the filter chips.
  useEffect(() => {
    let cancelled = false;
    apiClient
      .getExchanges()
      .then((response) => {
        if (!cancelled) setExchanges(response.exchanges);
      })
      .catch(() => {
        if (!cancelled) setExchanges([]);
      });
    return () => {
      cancelled = true;
    };
  }, []
  );

  // "/" focuses the search field, mirroring the global shortcut.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commitSearch = (value: string) => {
    setInput(value);
    if (value.trim()) {
      setRecentSearches((current) => {
        const next = [value, ...current.filter((s) => s !== value)].slice(0, 6);
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        return next;
      });
    }
  };

  const setFilter = (key: string, value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  const goToPage = (next: number) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.set("page", String(next));
        return params;
      },
      { replace: true },
    );
  };

  const params = useMemo(
    () => ({ q, exchange, status, page, limit: PAGE_SIZE }),
    [q, exchange, status, page],
  );
  const { state, retry } = useCompanySearch(params);

  const totalPages =
    state.phase === "ready" ? Math.max(1, Math.ceil(state.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      {/* Search controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={input}
            onChange={(event) => commitSearch(event.target.value)}
            placeholder="Search by company name or ticker — e.g. NVIDIA, NVDA, Berkshire Hathaway"
            aria-label="Search companies"
            className="h-11 w-full rounded-lg border border-hairline bg-surface pl-10 pr-10 text-[14px] outline-none transition-colors placeholder:text-muted/70 focus:border-foreground/40"
          />
          {input && (
            <button
              type="button"
              onClick={() => setInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("exchange", "")}
            className={cn(
              "rounded-full border px-3 py-1 text-[12px] transition-colors",
              !exchange
                ? "border-foreground/30 bg-subtle font-medium text-foreground"
                : "border-hairline text-muted hover:text-foreground",
            )}
          >
            All exchanges
          </button>
          {(exchanges ?? []).map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() =>
                setFilter("exchange", exchange === item.code ? "" : item.code)
              }
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] transition-colors",
                exchange === item.code
                  ? "border-foreground/30 bg-subtle font-medium text-foreground"
                  : "border-hairline text-muted hover:text-foreground",
              )}
            >
              {item.label}
              <span className="ml-1.5 text-muted/70">{item.company_count}</span>
            </button>
          ))}

          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-muted">
            Listing
            <select
              value={status}
              onChange={(event) => setFilter("status", event.target.value)}
              aria-label="Filter by listing status"
              className="rounded-md border border-hairline bg-surface px-2 py-1 text-[12px] text-foreground outline-none"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </span>
        </div>

        {mode === "search" && recentSearches.length > 0 && !input && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted">
              Recent
            </span>
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => commitSearch(term)}
                className="rounded-full bg-subtle px-2.5 py-1 text-[12px] text-muted transition-colors hover:text-foreground"
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <Panel
        bodyClassName="p-0"
        subtitle={
          state.phase === "ready"
            ? `${state.data.total.toLocaleString()} ${
                state.data.total === 1 ? "company" : "companies"
              }${q ? ` matching “${q}”` : ""}`
            : undefined
        }
        actions={
          state.phase === "ready" && (
            <Badge tone={state.data.data_source.degraded ? "down" : "outline"}>
              {state.data.data_source.label}
              {state.data.data_source.degraded ? " · offline fixtures" : ""}
            </Badge>
          )
        }
      >
        {state.phase === "loading" || state.phase === "idle" ? (
          <div className="divide-y divide-hairline">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-5 py-3">
                <Skeleton className="h-8 w-44" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="hidden h-4 w-24 md:block" />
              </div>
            ))}
          </div>
        ) : state.phase === "error" ? (
          <ErrorState
            title="Company search is unavailable"
            detail={state.message}
            onRetry={retry}
          />
        ) : state.data.results.length === 0 ? (
          <EmptyState
            title="No companies match your search"
            hint="Check the spelling, try the ticker instead of the name, or widen the exchange filter."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {state.data.results.map((company) => (
              <ResultRow key={`${company.ticker}-${company.exchange}`} company={company} />
            ))}
          </ul>
        )}

        {state.phase === "ready" && state.data.total > PAGE_SIZE && (
          <footer className="flex items-center justify-between border-t border-hairline px-5 py-3">
            <span className="text-[12px] text-muted">
              Page {page} of {totalPages}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                className="flex items-center gap-1 rounded-md border border-hairline px-2.5 py-1 text-[12px] text-muted transition-colors hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
                className="flex items-center gap-1 rounded-md border border-hairline px-2.5 py-1 text-[12px] text-muted transition-colors hover:text-foreground disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          </footer>
        )}
      </Panel>
    </div>
  );
}
