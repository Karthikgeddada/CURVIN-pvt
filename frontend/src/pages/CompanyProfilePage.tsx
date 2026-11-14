import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { apiClient } from "@/core/api/client";
import { ApiError } from "@/core/error-handling/ApiError";
import { useRecentCompanies } from "@/features/companies/hooks/useRecentCompanies";
import { Badge } from "@/shared/components/Badge";
import { Panel } from "@/shared/components/Panel";
import { Skeleton } from "@/shared/components/Skeleton";
import { EmptyState, ErrorState, UnavailableState } from "@/shared/components/StateViews";
import type {
  CompanyProfile,
  FiscalYearSummary,
} from "@/shared/types/company";
import { useCompanyIntelligence } from "@/features/companies/hooks/useCompanyIntelligence";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.06em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-[13px]">{children}</dd>
    </div>
  );
}

function ValueOrDash({ value }: { value: string | number | null }) {
  if (value === null || value === "") {
    return <span className="text-muted">Not available</span>;
  }
  return <span>{value}</span>;
}

function displayUrl(url: string): string {
  if (url.startsWith("https://")) return url.slice("https://".length);
  if (url.startsWith("http://")) return url.slice("http://".length);
  return url;
}

/** Compact money, e.g. $130.5B — keeps the table scannable. */
function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return value.toLocaleString();
  }
}

function metricValue(label: string, year: FiscalYearSummary): number | null {
  switch (label) {
    case "Revenue":
      return year.revenue;
    case "Net income":
      return year.net_income;
    case "Operating income":
      return year.operating_income;
    case "Total assets":
      return year.total_assets;
    case "Stockholders' equity":
      return year.stockholders_equity;
    case "Diluted EPS":
      return year.diluted_eps;
    default:
      return null;
  }
}

const FUNDAMENTAL_METRICS = [
  "Revenue",
  "Net income",
  "Operating income",
  "Total assets",
  "Stockholders' equity",
  "Diluted EPS",
] as const;

/**
 * Company intelligence profile. Identity and business sections come
 * from verified reference data; market and fundamentals show honest
 * unavailable states until their providers are configured.
 */
export function CompanyProfilePage() {
  const { ticker = "" } = useParams();
  const decoded = decodeURIComponent(ticker);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const { addRecent } = useRecentCompanies();
  const recordedRef = useRef<string | null>(null);
  const intelligence = useCompanyIntelligence(decoded);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProfile(null);
    apiClient
      .getCompanyProfile(decoded)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setLoading(false);
        if (recordedRef.current !== data.identity.ticker) {
          recordedRef.current = data.identity.ticker;
          addRecent({
            ticker: data.identity.ticker,
            name: data.identity.name,
            exchange: data.identity.exchange,
            viewed_at: new Date().toISOString(),
          });
        }
      })
      .catch((cause) => {
        if (cancelled) return;
        setLoading(false);
        if (cause instanceof ApiError) {
          setError({ code: cause.code, message: cause.message });
        } else {
          setError({
            code: "unknown",
            message: "Unexpected error loading the company profile.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [decoded, addRecent]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <Panel>
        {error.code === "company_not_found" ? (
          <EmptyState
            title={`No company found for ${decoded}`}
            hint={
              <span>
                Check the ticker or{" "}
                <Link to="/companies" className="underline underline-offset-2">
                  search by company name
                </Link>
                .
              </span>
            }
          />
        ) : (
          <ErrorState
            title="Company profile is unavailable"
            detail={error.message}
          />
        )}
      </Panel>
    );
  }

  if (!profile) return null;

  const { identity, business } = profile;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-[24px] font-semibold tracking-tight">
            {identity.name}
          </h1>
          <span className="font-mono text-[18px] font-medium text-muted">
            {identity.ticker}
          </span>
          <Badge tone="outline">{identity.exchange}</Badge>
          {identity.share_class && (
            <Badge tone="muted">Class {identity.share_class}</Badge>
          )}
          <Badge
            tone={
              identity.status === "active"
                ? "up"
                : identity.status === "inactive"
                  ? "down"
                  : "muted"
            }
          >
            {identity.status}
          </Badge>
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
          {identity.cik && <span>CIK {identity.cik}</span>}
          {identity.country && <span>{identity.country}</span>}
          {profile.as_of && (
            <span>
              Reference data as of{" "}
              {new Date(profile.as_of).toLocaleString()}
            </span>
          )}
          <Badge tone={profile.data_source.degraded ? "down" : "outline"}>
            {profile.data_source.label}
            {profile.data_source.degraded ? " · offline fixtures" : ""}
          </Badge>
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Business profile">
          {business.description ? (
            <p className="text-[13px] leading-relaxed">
              {business.description}
            </p>
          ) : (
            <p className="text-[13px] text-muted">
              No business description available from the current reference
              provider.
            </p>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-hairline pt-4">
            <Field label="Sector">
              <ValueOrDash value={business.sector} />
            </Field>
            <Field label="Industry">
              <ValueOrDash value={business.industry} />
            </Field>
            <Field label="Headquarters">
              <ValueOrDash value={business.headquarters} />
            </Field>
            <Field label="Employees">
              <ValueOrDash
                value={
                  business.employees !== null
                    ? business.employees.toLocaleString()
                    : null
                }
              />
            </Field>
            <Field label="Website">
              {identity.website ? (
                <a
                  href={identity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-2"
                >
                  {displayUrl(identity.website)}
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-muted">Not available</span>
              )}
            </Field>
            <Field label="Country of incorporation">
              <ValueOrDash value={identity.country} />
            </Field>
          </dl>
        </Panel>

        <Panel title="Market information">
          {intelligence.market.phase === "loading" ? (
            <Skeleton className="h-40" />
          ) : intelligence.market.phase === "ready" &&
            intelligence.market.data.quote ? (
            (() => {
              const quote = intelligence.market.data.quote;
              return (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Last price">
                    {quote.price.toLocaleString()} {quote.currency}
                  </Field>
                  <Field label="Previous close">
                    {quote.previous_close.toLocaleString()} {quote.currency}
                  </Field>
                  <Field label="Daily change">
                    <span
                      className={
                        quote.change >= 0
                          ? "text-change-up"
                          : "text-change-down"
                      }
                    >
                      {quote.change >= 0 ? "+" : ""}
                      {quote.change.toFixed(2)} (
                      {quote.change_percent.toFixed(2)}%)
                    </span>
                  </Field>
                  <Field label="Market capitalization">
                    {quote.market_capitalization
                      ? `${quote.market_capitalization.toLocaleString()} ${quote.currency}`
                      : "Not available"}
                  </Field>
                  <Field label="Data as of">
                    {new Date(quote.as_of).toLocaleString()}
                  </Field>
                  <Field label="Data latency">
                    {quote.data_delay === "realtime"
                      ? "Real-time"
                      : quote.data_delay === "delayed"
                        ? "Delayed"
                        : "End of day"}
                  </Field>
                  <div className="col-span-2 border-t border-hairline pt-3">
                    <Badge
                      tone={
                        intelligence.market.data.data_source.degraded
                          ? "down"
                          : "outline"
                      }
                    >
                      {intelligence.market.data.data_source.label}
                    </Badge>
                  </div>
                </div>
              );
            })()
          ) : (
            <UnavailableState
              title="Market data not available"
              detail={
                intelligence.market.phase === "unavailable"
                  ? intelligence.market.reason
                  : "No quote is available for this ticker right now."
              }
            />
          )}
        </Panel>
      </div>

      <Panel
        title="Financial fundamentals"
        subtitle="Audited annual figures from SEC XBRL company facts"
      >
        {intelligence.fundamentals.phase === "loading" ? (
          <Skeleton className="h-48" />
        ) : intelligence.fundamentals.phase === "ready" ? (
          intelligence.fundamentals.data.fiscal_years.length > 0 ? (
            (() => {
              const years = intelligence.fundamentals.data.fiscal_years.slice(
                0,
                5,
              );
              const currency = years[0].currency;
              return (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-[13px]">
                      <thead>
                        <tr className="border-b border-hairline text-left">
                          <th className="py-2 pr-4 text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
                            Metric
                          </th>
                          {years.map((year) => (
                            <th
                              key={year.fiscal_year}
                              scope="col"
                              className="px-4 py-2 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted"
                            >
                              FY{year.fiscal_year}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {FUNDAMENTAL_METRICS.map((label) => (
                          <tr
                            key={label}
                            className="border-b border-hairline/60 last:border-0"
                          >
                            <th
                              scope="row"
                              className="py-2 pr-4 text-left font-normal text-muted"
                            >
                              {label}
                            </th>
                            {years.map((year) => {
                              const value = metricValue(label, year);
                              return (
                                <td
                                  key={year.fiscal_year}
                                  className="px-4 py-2 text-right font-mono tabular-nums"
                                >
                                  {value === null ? (
                                    <span className="text-muted">—</span>
                                  ) : label === "Diluted EPS" ? (
                                    value.toFixed(2)
                                  ) : (
                                    formatMoney(value, currency)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    <span>
                      Period ends {years[0].period_end}
                      {years.length > 1
                        ? ` back to ${years[years.length - 1].period_end}`
                        : ""}
                      .
                    </span>
                    <Badge
                      tone={
                        intelligence.fundamentals.data.data_source.degraded
                          ? "down"
                          : "outline"
                      }
                    >
                      {intelligence.fundamentals.data.data_source.label}
                    </Badge>
                  </p>
                </div>
              );
            })()
          ) : (
            <UnavailableState
              title="No annual figures found"
              detail="The SEC company facts feed returned no annual data for this company."
            />
          )
        ) : (
          <UnavailableState
            title="Fundamentals not available"
            detail={
              intelligence.fundamentals.phase === "unavailable"
                ? intelligence.fundamentals.reason
                : "The live feed is currently unreachable."
            }
          />
        )}
      </Panel>

      <Panel
        title="SEC filings"
        subtitle="Most recent submissions, straight from EDGAR"
      >
        {intelligence.filings.phase === "loading" ? (
          <Skeleton className="h-48" />
        ) : intelligence.filings.phase === "ready" ? (
          intelligence.filings.data.filings.length > 0 ? (
            (() => {
              const filings = intelligence.filings.data.filings;
              return (
                <div>
                  <ul className="divide-y divide-hairline">
                    {filings.map((filing) => (
                      <li
                        key={filing.accession_no}
                        className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <Badge tone="outline" className="font-mono">
                            {filing.form}
                          </Badge>
                          <div>
                            <p className="text-[13px]">
                              Filed {filing.filed_at}
                            </p>
                            {filing.report_period && (
                              <p className="text-[11px] text-muted">
                                Period {filing.report_period}
                              </p>
                            )}
                          </div>
                        </div>
                        <a
                          href={filing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[12px] underline underline-offset-2"
                        >
                          Document
                          <ArrowUpRight
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3">
                    <Badge
                      tone={
                        intelligence.filings.data.data_source.degraded
                          ? "down"
                          : "outline"
                      }
                    >
                      {intelligence.filings.data.data_source.label}
                    </Badge>
                  </p>
                </div>
              );
            })()
          ) : (
            <EmptyState
              title="No recent filings"
              hint={intelligence.filings.data.data_source.label}
            />
          )
        ) : (
          <UnavailableState
            title="Filings not available"
            detail={
              intelligence.filings.phase === "unavailable"
                ? intelligence.filings.reason
                : "The live feed is currently unreachable."
            }
          />
        )}
      </Panel>
    </div>
  );
}
