import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/core/api/client";
import type {
  CompanyFilingsResponse,
  CompanyFundamentalsResponse,
  CompanyMarketResponse,
} from "@/shared/types/company";

/**
 * Lifecycle of one M2 sub-resource on the company profile.
 *
 * "unavailable" is a first-class, honest state — never an error and
 * never replaced with simulated data. It covers both a provider that
 * is not configured and one whose live feed is unreachable; the
 * reason always comes from the API's data_source label.
 */
export type IntelligenceResource<T> =
  | { phase: "loading" }
  | { phase: "ready"; data: T }
  | { phase: "unavailable"; reason: string }
  | { phase: "error"; message: string };

type Fetcher<T> = (ticker: string) => Promise<T>;

function useResource<T>(
  ticker: string,
  fetcher: Fetcher<T>,
  toUnavailable: (data: T) => string | null,
): IntelligenceResource<T> {
  const [state, setState] = useState<IntelligenceResource<T>>({
    phase: "loading",
  });
  const runIdRef = useRef(0);

  useEffect(() => {
    const runId = ++runIdRef.current;
    setState({ phase: "loading" });
    fetcher(ticker)
      .then((data) => {
        if (runId !== runIdRef.current) return;
        const reason = toUnavailable(data);
        if (reason !== null) {
          setState({ phase: "unavailable", reason });
        } else {
          setState({ phase: "ready", data });
        }
      })
      .catch(() => {
        if (runId !== runIdRef.current) return;
        // Network/HTTP failure — the profile itself still renders;
        // this panel reports its own unavailability.
        setState({
          phase: "unavailable",
          reason: "The live feed is currently unreachable.",
        });
      });
    // fetcher and toUnavailable are stable module-level helpers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  return state;
}

const marketUnavailable = (data: CompanyMarketResponse): string | null =>
  data.quote === null ? data.data_source.label : null;

const fundamentalsUnavailable = (
  data: CompanyFundamentalsResponse,
): string | null => (data.available ? null : data.data_source.label);

/** Filings are ready even when the list is empty — empty is honest. */
const filingsUnavailable = (_data: CompanyFilingsResponse): string | null =>
  null;

/**
 * Loads the three M2 intelligence sub-resources for one company in
 * parallel. Each resource has an independent state machine so a
 * failing feed degrades only its own panel.
 */
export function useCompanyIntelligence(ticker: string) {
  const market = useResource(ticker, apiClient.getCompanyMarket, marketUnavailable);
  const fundamentals = useResource(
    ticker,
    apiClient.getCompanyFundamentals,
    fundamentalsUnavailable,
  );
  const filings = useResource(ticker, apiClient.getCompanyFilings, filingsUnavailable);
  return { market, fundamentals, filings };
}
