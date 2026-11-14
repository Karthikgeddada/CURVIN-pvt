// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

// A row shaped like the live SEC dataset: sector/industry honestly
// null, listing status not part of the dataset.
const secRow = {
  name: "Apple Inc.",
  ticker: "AAPL",
  exchange: "NASDAQ",
  cik: "0000320193",
  sector: null,
  industry: null,
  status: "unknown",
};

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

  it("renders an honest em-dash for missing sector and industry", async () => {
    searchCompanies.mockResolvedValue(searchResponse([secRow], 1));
    renderView();
    await waitFor(() => expect(screen.getByText("Apple Inc.")).toBeTruthy());
    // Both the sector and the industry columns fall back to an em-dash.
    expect(screen.getAllByText("—").length).toBe(2);
    expect(screen.getByText("unknown")).toBeTruthy();
  });

  it("offers jump and first/last controls in a large universe", async () => {
    searchCompanies.mockResolvedValue(searchResponse([secRow], 10_416));
    renderView();
    await waitFor(() =>
      expect(screen.getByText("Page 1 of 417")).toBeTruthy(),
    );
    expect(screen.getByLabelText("Jump to page")).toBeTruthy();
    expect(screen.getByLabelText("First page")).toBeTruthy();
    expect(screen.getByLabelText("Last page")).toBeTruthy();
  });

  it("jumps to a typed page number and clamps out-of-range entries", async () => {
    searchCompanies.mockResolvedValue(searchResponse([secRow], 10_416));
    renderView();
    await waitFor(() =>
      expect(screen.getByLabelText("Jump to page")).toBeTruthy(),
    );
    const jump = screen.getByLabelText("Jump to page");
    fireEvent.change(jump, { target: { value: "42" } });
    fireEvent.click(screen.getByText("Go"));
    await waitFor(() =>
      expect(searchCompanies).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 42, limit: 25 }),
      ),
    );

    // The footer unmounts while the next page loads and remounts
    // afterwards, so re-query the fresh jump field for the second entry.
    await waitFor(() =>
      expect(screen.getByText("Page 42 of 417")).toBeTruthy(),
    );
    const jumpAgain = screen.getByLabelText("Jump to page");

    // An impossible page number lands on the last real page, never beyond.
    fireEvent.change(jumpAgain, { target: { value: "99999" } });
    fireEvent.click(screen.getByText("Go"));
    await waitFor(() =>
      expect(searchCompanies).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 417 }),
      ),
    );
  });

  it("keeps the plain footer for a small universe", async () => {
    searchCompanies.mockResolvedValue(searchResponse([secRow], 40));
    renderView();
    await waitFor(() =>
      expect(screen.getByText("Page 1 of 2")).toBeTruthy(),
    );
    expect(screen.queryByLabelText("Jump to page")).toBeNull();
    expect(screen.queryByLabelText("First page")).toBeNull();
    expect(screen.queryByLabelText("Last page")).toBeNull();
  });
});
