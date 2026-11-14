// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";

const mocks = vi.hoisted(() => ({
  searchCompanies: vi.fn(),
  getExchanges: vi.fn(),
}));

vi.mock("../src/core/api/client", () => ({
  apiClient: {
    searchCompanies: mocks.searchCompanies,
    getExchanges: mocks.getExchanges,
  },
}));

const searchCompanies = mocks.searchCompanies;
const getExchanges = mocks.getExchanges;

import { CompanySearchView } from "../src/features/companies/components/CompanySearchView";

const fixtureSource = { provider: "fixtures", label: "Deterministic fixtures", degraded: true };

function searchResponse(results: object[], total: number) {
  return {
    results,
    total,
    page: 1,
    limit: 25,
    data_source: fixtureSource,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  searchCompanies.mockReset();
  getExchanges.mockReset();
  getExchanges.mockResolvedValue({
    exchanges: [
      { code: "NASDAQ", label: "NASDAQ", company_count: 18 },
      { code: "NYSE", label: "NYSE", company_count: 22 },
    ],
    data_source: fixtureSource,
  });
});

afterEach(() => {
  cleanup();
});

function renderView(mode: "search" | "directory" = "search") {
  return render(
    <MemoryRouter initialEntries={["/companies"]}>
      <CompanySearchView mode={mode} />
    </MemoryRouter>,
  );
}

describe("CompanySearchView", () => {
  it("renders results with ticker, exchange and status", async () => {
    searchCompanies.mockResolvedValue(
      searchResponse(
        [
          {
            name: "NVIDIA Corporation",
            ticker: "NVDA",
            exchange: "NASDAQ",
            cik: "0001045810",
            sector: "Technology",
            industry: "Semiconductors",
            status: "active",
          },
        ],
        1,
      ),
    );
    renderView();
    await waitFor(() =>
      expect(screen.getByText("NVIDIA Corporation")).toBeTruthy(),
    );
    expect(screen.getByText("NVDA")).toBeTruthy();
    // NASDAQ appears both as a filter chip and as the row's exchange.
    expect(screen.getAllByText("NASDAQ").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("active")).toBeTruthy();
    expect(screen.getByText("CIK 0001045810")).toBeTruthy();
  });

  it("links each row to the company profile", async () => {
    searchCompanies.mockResolvedValue(
      searchResponse(
        [
          {
            name: "Apple Inc.",
            ticker: "AAPL", exchange: "NASDAQ", cik: null,
            sector: null, industry: null, status: "active",
          },
        ],
        1,
      ),
    );
    renderView();
    await waitFor(() => expect(screen.getByText("Apple Inc.")).toBeTruthy());
    const link = screen.getByRole("link", { name: /Apple/ });
    expect(link.getAttribute("href")).toBe("/companies/AAPL");
  });

  it("shows an empty state when nothing matches", async () => {
    searchCompanies.mockResolvedValue(searchResponse([], 0));
    renderView();
    await waitFor(() =>
      expect(screen.getByText("No companies match your search")).toBeTruthy(),
    );
  });

  it("shows an error state with retry when the API fails", async () => {
    searchCompanies.mockRejectedValue(new Error("network down"));
    renderView();
    await waitFor(() =>
      expect(screen.getByText("Company search is unavailable")).toBeTruthy(),
    );
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("surfaces the degraded data source badge", async () => {
    searchCompanies.mockResolvedValue(searchResponse([], 0));
    renderView("directory");
    await waitFor(() =>
      expect(screen.getByText(/Deterministic fixtures/)).toBeTruthy(),
    );
  });

  it("renders exchange filter chips with counts", async () => {
    searchCompanies.mockResolvedValue(searchResponse([], 0));
    renderView();
    await waitFor(() => expect(screen.getByText("NYSE")).toBeTruthy());
    expect(screen.getByText("22")).toBeTruthy();
    expect(screen.getByText("All exchanges")).toBeTruthy();
  });
});
