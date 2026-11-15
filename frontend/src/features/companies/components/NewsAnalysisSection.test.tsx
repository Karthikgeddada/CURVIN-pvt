// @vitest-environment jsdom
/**
 * Stock market analysis section tests. Like the hook tests, these use
 * the REAL ApiClient with a stubbed global fetch — a mocked client
 * module would tolerate a detached method reference and never catch a
 * `this`-binding regression (the M2 production crash class).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { NewsAnalysisSection } from "./NewsAnalysisSection";
import type { CompanyNewsAnalysisResponse } from "@/shared/types/company";

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

const analysisBody: CompanyNewsAnalysisResponse = {
  ticker: "NVDA",
  window_hours: 24,
  available: true,
  article_count: 3,
  overall: {
    label: "negative",
    positive_pct: 33.3,
    negative_pct: 66.7,
    neutral_pct: 0,
    summary: "Overall negative: 2 of 3 recent articles read negative.",
  },
  articles: [
    {
      title: "Company warns of weaker demand",
      source: "Stub Wire",
      published_at: "2026-11-15T10:00:00+00:00",
      url: "https://example.com/a",
      sentiment: {
        label: "negative",
        confidence: 0.85,
        reason: "The article cites weaker demand warnings.",
        engine: "stub",
      },
    },
  ],
  data_source: { provider: "massive", label: "Massive news", degraded: false },
  sentiment_engine: {
    provider: "llm",
    label: "LLM-judged (stub-model)",
    degraded: false,
  },
  as_of: "2026-11-15T10:05:00+00:00",
};

describe("NewsAnalysisSection (real ApiClient, stubbed fetch)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("stays idle until the user presses the button", () => {
    render(<NewsAnalysisSection ticker="NVDA" />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/fetch every story/i)).toBeTruthy();
  });

  it("fetches and renders overall and per-article verdicts on press", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain("/api/v1/companies/NVDA/news-analysis");
      return jsonResponse(analysisBody);
    });
    render(<NewsAnalysisSection ticker="NVDA" />);
    fireEvent.click(screen.getByRole("button", { name: /stock market analysis/i }));

    await waitFor(() =>
      expect(screen.getByText(/sentiment across 3 stories/i)).toBeTruthy(),
    );
    expect(screen.getByText(/66.7% negative/i)).toBeTruthy();
    expect(screen.getByText(/overall negative: 2 of 3/i)).toBeTruthy();
    expect(screen.getByText(/weaker demand warnings/i)).toBeTruthy();
    expect(screen.getAllByText("negative").length).toBeGreaterThan(0);
  });

  it("maps an unavailable feed to the honest state from data_source", async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        ...analysisBody,
        available: false,
        article_count: 0,
        overall: null,
        articles: [],
        data_source: {
          provider: "none",
          label: "No news provider configured",
          degraded: false,
        },
        sentiment_engine: null,
      }),
    );
    render(<NewsAnalysisSection ticker="NVDA" />);
    fireEvent.click(screen.getByRole("button", { name: /stock market analysis/i }));

    await waitFor(() =>
      expect(screen.getByText("News analysis not available")).toBeTruthy(),
    );
    expect(screen.getByText("No news provider configured")).toBeTruthy();
  });

  it("offers a retry after a failed call", async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({ error: { code: "http_500", message: "boom" } }, 500),
    );
    render(<NewsAnalysisSection ticker="NVDA" />);
    fireEvent.click(screen.getByRole("button", { name: /stock market analysis/i }));

    await waitFor(() =>
      expect(screen.getByText("News analysis failed")).toBeTruthy(),
    );
    expect(screen.getByText("Retry")).toBeTruthy();
  });
});
