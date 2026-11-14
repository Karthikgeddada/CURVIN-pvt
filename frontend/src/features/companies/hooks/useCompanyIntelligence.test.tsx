// @vitest-environment jsdom
/**
 * Regression test for the `this`-detachment crash seen in production:
 * the hook passed apiClient.getCompanyMarket as a bare reference, so
 * `this.request` was undefined and the whole profile route crashed
 * with "Cannot read properties of undefined (reading 'request')".
 *
 * These tests use the REAL ApiClient with a stubbed global fetch — a
 * mocked client module would silently tolerate the detached method and
 * never catch the regression.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { useCompanyIntelligence } from "./useCompanyIntelligence";
import type { CompanyMarketResponse } from "@/shared/types/company";

const jsonResponse = (body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

const marketBody: CompanyMarketResponse = {
  ticker: "AAPL",
  quote: {
    price: 356.27,
    previous_close: 354.88,
    change: 1.39,
    change_percent: 0.3917,
    currency: "USD",
    market_capitalization: null,
    as_of: "2026-11-13T05:00:00+00:00",
    data_delay: "eod",
  },
  data_source: {
    provider: "massive",
    label: "Massive (end-of-day)",
    degraded: false,
  },
  as_of: "2026-11-14T17:28:57Z",
};

const fundamentalsBody = {
  ticker: "AAPL",
  cik: "0000320193",
  available: true,
  fiscal_years: [],
  data_source: { provider: "sec-edgar", label: "SEC EDGAR", degraded: false },
  as_of: "2026-11-14T17:28:57Z",
};

const filingsBody = {
  ticker: "AAPL",
  cik: "0000320193",
  filings: [],
  data_source: { provider: "sec-edgar", label: "SEC EDGAR", degraded: false },
  as_of: "2026-11-14T17:28:57Z",
};

describe("useCompanyIntelligence (real ApiClient, stubbed fetch)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/market")) return jsonResponse(marketBody);
      if (url.endsWith("/fundamentals")) return jsonResponse(fundamentalsBody);
      if (url.includes("/filings")) return jsonResponse(filingsBody);
      return Promise.reject(new Error(`unexpected url: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("invokes the real client methods without losing `this`", async () => {
    const { result } = renderHook(() => useCompanyIntelligence("AAPL"));

    await waitFor(() => expect(result.current.market.phase).toBe("ready"));
    await waitFor(() =>
      expect(result.current.fundamentals.phase).toBe("ready"),
    );
    await waitFor(() => expect(result.current.filings.phase).toBe("ready"));

    const called = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(
      called.some((url) => url.endsWith("/api/v1/companies/AAPL/market")),
    ).toBe(true);
    expect(
      called.some((url) =>
        url.endsWith("/api/v1/companies/AAPL/fundamentals"),
      ),
    ).toBe(true);
    expect(
      called.some((url) => url.includes("/api/v1/companies/AAPL/filings")),
    ).toBe(true);
  });

  it("maps a null quote to an honest unavailable state", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/market")) {
        return jsonResponse({
          ...marketBody,
          quote: null,
          data_source: {
            provider: "none",
            label: "No market data provider configured",
            degraded: false,
          },
        });
      }
      if (url.endsWith("/fundamentals")) return jsonResponse(fundamentalsBody);
      return jsonResponse(filingsBody);
    });

    const { result } = renderHook(() => useCompanyIntelligence("AAPL"));

    // Narrow inside waitFor so TypeScript accepts `.reason` on the
    // discriminated union and testing-library keeps retrying.
    await waitFor(() => {
      if (result.current.market.phase !== "unavailable") {
        throw new Error(
          `market phase not unavailable: ${result.current.market.phase}`,
        );
      }
      expect(result.current.market.reason).toBe(
        "No market data provider configured",
      );
    });
  });
});
