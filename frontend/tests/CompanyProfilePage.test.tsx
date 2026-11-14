// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { ApiError } from "../src/core/error-handling/ApiError";

const mocks = vi.hoisted(() => ({
  getCompanyProfile: vi.fn(),
}));

vi.mock("../src/core/api/client", () => ({
  apiClient: { getCompanyProfile: mocks.getCompanyProfile },
}));

const getCompanyProfile = mocks.getCompanyProfile;

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
      expect(
        screen.getByText("Market data not yet available"),
      ).toBeTruthy(),
    );
    expect(
      screen.getByText("Fundamentals not yet available"),
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
    getCompanyProfile.mockResolvedValue({
      ...profile,
      market: {
        price: 120.5,
        previous_close: 118,
        change: 2.5,
        change_percent: 2.12,
        currency: "USD",
        market_capitalization: null,
        as_of: "2026-01-01T21:00:00+00:00",
        data_delay: "eod",
      },
    });
    renderProfile("NVDA");
    await waitFor(() =>
      expect(screen.getByText("120.5 USD")).toBeTruthy(),
    );
    expect(screen.getByText("End of day")).toBeTruthy();
  });
});
