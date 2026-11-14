// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { ApiError } from "../src/core/error-handling/ApiError";

const mocks = vi.hoisted(() => ({
  getCompanyProfile: vi.fn(),
  getCompanyMarket: vi.fn(),
  getCompanyFundamentals: vi.fn(),
  getCompanyFilings: vi.fn(),
}));

vi.mock("../src/core/api/client", () => ({
  apiClient: {
    getCompanyProfile: mocks.getCompanyProfile,
    getCompanyMarket: mocks.getCompanyMarket,
    getCompanyFundamentals: mocks.getCompanyFundamentals,
    getCompanyFilings: mocks.getCompanyFilings,
  },
}));

const getCompanyProfile = mocks.getCompanyProfile;
const getCompanyMarket = mocks.getCompanyMarket;
const getCompanyFundamentals = mocks.getCompanyFundamentals;
const getCompanyFilings = mocks.getCompanyFilings;

import { CompanyProfilePage } from "../src/pages/CompanyProfilePage";

const profile = {
  identity: {
    name: "NVIDIA Corporation",
    ticker: "NVDA",
    exchange: "NASDAQ",
    cik: "0001045810",
    status: "active",
    share_class: null,
    country: "United States",
    website: null,
  },
  business: {
    description: null,
    sector: "Technology",
    industry: "Semiconductors",
    headquarters: null,
    employees: null,
  },
  market: null,
  fundamentals_available: false,
  data_source: {
    provider: "fixtures",
    label: "Deterministic fixtures",
    degraded: true,
  },
  as_of: "2026-01-01T00:00:00+00:00",
};

beforeEach(() => {
  window.localStorage.clear();
  getCompanyProfile.mockReset();
  getCompanyMarket.mockReset();
  getCompanyFundamentals.mockReset();
  getCompanyFilings.mockReset();
  // Default: every intelligence feed reports honest unavailability.
  getCompanyMarket.mockResolvedValue({
    ticker: "NVDA",
    quote: null,
    data_source: {
      provider: "none",
      label: "No market data provider configured",
      degraded: false,
    },
    as_of: "2026-01-01T00:00:00+00:00",
  });
  getCompanyFundamentals.mockResolvedValue({
    ticker: "NVDA",
    available: false,
    fiscal_years: [],
    data_source: {
      provider: "sec-edgar",
      label: "SEC EDGAR company facts (unavailable)",
      degraded: true,
    },
    as_of: "2026-01-01T00:00:00+00:00",
  });
  getCompanyFilings.mockResolvedValue({
    ticker: "NVDA",
    filings: [],
    data_source: {
      provider: "sec-edgar",
      label: "SEC EDGAR filings (unavailable)",
      degraded: true,
    },
    as_of: "2026-01-01T00:00:00+00:00",
  });
});

afterEach(() => {
  cleanup();
});

function renderProfile(ticker: string) {
  return render(
    <MemoryRouter initialEntries={[`/companies/${ticker}`]}>
      <Routes>
        <Route
          path="/companies/:ticker"
          element={<CompanyProfilePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CompanyProfilePage", () => {
  it("renders identity, business profile and source badge", async () => {
    getCompanyProfile.mockResolvedValue(profile);
    renderProfile("NVDA");
    await waitFor(() =>
      expect(screen.getByText("NVIDIA Corporation")).toBeTruthy(),
    );
    expect(screen.getByText("NVDA")).toBeTruthy();
    expect(screen.getByText("NASDAQ")).toBeTruthy();
    expect(screen.getByText("CIK 0001045810")).toBeTruthy();
    expect(screen.getByText("Technology")).toBeTruthy();
    expect(screen.getByText(/Deterministic fixtures/)).toBeTruthy();
  });

  it("shows honest unavailable states for market and fundamentals", async () => {
    getCompanyProfile.mockResolvedValue(profile);
    renderProfile("NVDA");
    await waitFor(() =>
      expect(screen.getByText("Market data not available")).toBeTruthy(),
    );
    expect(
      screen.getByText("No market data provider configured"),
    ).toBeTruthy();
    expect(screen.getByText("Fundamentals not available")).toBeTruthy();
    expect(
      screen.getByText("SEC EDGAR company facts (unavailable)"),
    ).toBeTruthy();
  });

  it("records the company in recently viewed", async () => {
    getCompanyProfile.mockResolvedValue(profile);
    renderProfile("NVDA");
    await waitFor(() =>
      expect(screen.getByText("NVIDIA Corporation")).toBeTruthy(),
    );
    const stored = JSON.parse(
      window.localStorage.getItem("curvin-recent-companies") ?? "[]",
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].ticker).toBe("NVDA");
    expect(stored[0].name).toBe("NVIDIA Corporation");
  });

  it("shows a not-found state for unknown tickers", async () => {
    getCompanyProfile.mockRejectedValue(
      new ApiError(
        404,
        "company_not_found",
        "No company found for ticker NOPE.",
      ),
    );
    renderProfile("NOPE");
    await waitFor(() =>
      expect(screen.getByText(/No company found for NOPE/)).toBeTruthy(),
    );
    expect(screen.getByText("search by company name")).toBeTruthy();
  });

  it("renders market data when the provider supplies it", async () => {
    getCompanyProfile.mockResolvedValue(profile);
    getCompanyMarket.mockResolvedValue({
      ticker: "NVDA",
      quote: {
        price: 120.5,
        previous_close: 118,
        change: 2.5,
        change_percent: 2.12,
        currency: "USD",
        market_capitalization: null,
        as_of: "2026-01-01T21:00:00+00:00",
        data_delay: "eod",
      },
      data_source: {
        provider: "stub-quotes",
        label: "Stub Quotes",
        degraded: false,
      },
      as_of: "2026-01-01T21:00:05+00:00",
    });
    renderProfile("NVDA");
    await waitFor(() => expect(screen.getByText("120.5 USD")).toBeTruthy());
    expect(screen.getByText("End of day")).toBeTruthy();
  });

  it("renders the fundamentals table from SEC annual figures", async () => {
    getCompanyProfile.mockResolvedValue(profile);
    getCompanyFundamentals.mockResolvedValue({
      ticker: "NVDA",
      available: true,
      fiscal_years: [
        {
          fiscal_year: 2025,
          period_end: "2025-01-26",
          currency: "USD",
          revenue: 130497000000,
          net_income: 72880000000,
          operating_income: 81453000000,
          total_assets: 111601000000,
          stockholders_equity: 79327000000,
          diluted_eps: 2.94,
        },
        {
          fiscal_year: 2024,
          period_end: "2024-01-28",
          currency: "USD",
          revenue: 60922000000,
          net_income: 29760000000,
          operating_income: 32972000000,
          total_assets: 65831000000,
          stockholders_equity: 42298000000,
          diluted_eps: 1.19,
        },
      ],
      data_source: {
        provider: "sec-edgar",
        label: "SEC EDGAR company facts",
        degraded: false,
      },
      as_of: "2026-01-01T00:00:00+00:00",
    });
    renderProfile("NVDA");
    await waitFor(() => expect(screen.getByText("FY2025")).toBeTruthy());
    expect(screen.getByText("FY2024")).toBeTruthy();
    expect(screen.getByText("$130.5B")).toBeTruthy();
    expect(screen.getByText("2.94")).toBeTruthy();
    expect(screen.getByText("SEC EDGAR company facts")).toBeTruthy();
  });

  it("renders recent filings with document links", async () => {
    getCompanyProfile.mockResolvedValue(profile);
    getCompanyFilings.mockResolvedValue({
      ticker: "NVDA",
      filings: [
        {
          form: "10-K",
          filed_at: "2026-02-25",
          accession_no: "0001045810-26-000012",
          report_period: "2026-01-25",
          primary_document: "nvda-20260125.htm",
          url: "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000012/nvda-20260125.htm",
        },
        {
          form: "8-K",
          filed_at: "2026-11-12",
          accession_no: "0001045810-26-000082",
          report_period: "2026-11-11",
          primary_document: "nvda-20261111.htm",
          url: "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000082/nvda-20261111.htm",
        },
      ],
      data_source: {
        provider: "sec-edgar",
        label: "SEC EDGAR submissions",
        degraded: false,
      },
      as_of: "2026-01-01T00:00:00+00:00",
    });
    renderProfile("NVDA");
    await waitFor(() =>
      expect(screen.getByText("Filed 2026-02-25")).toBeTruthy(),
    );
    expect(screen.getByText("Filed 2026-11-12")).toBeTruthy();
    const links = screen.getAllByText("Document");
    expect(links).toHaveLength(2);
    expect(
      (links[0] as HTMLAnchorElement).href.startsWith(
        "https://www.sec.gov/Archives",
      ),
    ).toBe(true);
  });

  it("degrades only the failing panel when one feed errors", async () => {
    getCompanyProfile.mockResolvedValue(profile);
    getCompanyFundamentals.mockRejectedValue(
      new ApiError(503, "http_503", "Service unavailable"),
    );
    renderProfile("NVDA");
    await waitFor(() =>
      expect(screen.getByText("Fundamentals not available")).toBeTruthy(),
    );
    // The other panels still function: filings renders its source badge.
    expect(
      screen.getByText("SEC EDGAR filings (unavailable)"),
    ).toBeTruthy();
    expect(screen.getByText("Market data not available")).toBeTruthy();
  });
});
