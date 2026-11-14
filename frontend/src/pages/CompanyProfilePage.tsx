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
import type { CompanyProfile } from "@/shared/types/company";

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

  const { identity, business, market } = profile;

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
          {market ? (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Last price">
                {market.price.toLocaleString()} {market.currency}
              </Field>
              <Field label="Previous close">
                {market.previous_close.toLocaleString()} {market.currency}
              </Field>
              <Field label="Daily change">
                <span
                  className={
                    market.change >= 0 ? "text-change-up" : "text-change-down"
                  }
                >
                  {market.change >= 0 ? "+" : ""}
                  {market.change.toFixed(2)} ({market.change_percent.toFixed(2)}%)
                </span>
              </Field>
              <Field label="Market capitalization">
                {market.market_capitalization
                  ? `${market.market_capitalization.toLocaleString()} ${market.currency}`
                  : "Not available"}
              </Field>
              <Field label="Data as of">
                {new Date(market.as_of).toLocaleString()}
              </Field>
              <Field label="Data latency">
                {market.data_delay === "realtime"
                  ? "Real-time"
                  : market.data_delay === "delayed"
                    ? "Delayed"
                    : "End of day"}
              </Field>
            </div>
          ) : (
            <UnavailableState
              title="Market data not yet available"
              detail="No market data provider is configured for this milestone. Prices, market capitalization and daily changes appear here the moment a licensed provider is connected — never as simulated numbers."
            />
          )}
        </Panel>
      </div>

      <Panel
        title="Financial fundamentals"
        subtitle="Revenue, profitability, balance sheet and cash flow"
      >
        <UnavailableState
          title="Fundamentals not yet available"
          detail="Financial statements integration is planned for the next milestone, keyed by CIK from the same reference data. No estimated or placeholder figures are shown."
        />
      </Panel>
    </div>
  );
}
