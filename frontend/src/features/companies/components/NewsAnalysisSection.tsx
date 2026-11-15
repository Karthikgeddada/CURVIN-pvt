import { useEffect, useState } from "react";
import { ArrowUpRight, Newspaper, RefreshCw } from "lucide-react";
import { apiClient } from "@/core/api/client";
import { ApiError } from "@/core/error-handling/ApiError";
import { Badge } from "@/shared/components/Badge";
import type { BadgeTone } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Panel } from "@/shared/components/Panel";
import { Skeleton } from "@/shared/components/Skeleton";
import { ErrorState, UnavailableState } from "@/shared/components/StateViews";
import type {
  CompanyNewsAnalysisResponse,
  SentimentLabel,
} from "@/shared/types/company";

/**
 * Lifecycle of the on-demand stock market analysis. "idle" is the
 * resting state: nothing loads until the user explicitly presses the
 * button — news sentiment is an action, not ambient page weight.
 */
type AnalysisPhase =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; data: CompanyNewsAnalysisResponse }
  | { state: "unavailable"; reason: string }
  | { state: "error"; message: string };

function toneFor(label: SentimentLabel): BadgeTone {
  switch (label) {
    case "positive":
      return "up";
    case "negative":
      return "down";
    default:
      return "muted";
  }
}

/**
 * Stock market analysis: fetches the last 24 hours of news for the
 * company and shows how positive, negative or neutral the coverage
 * reads — overall and article by article, always with the reason why.
 * Availability and degradation are surfaced from data_source exactly
 * like every other intelligence panel; a heuristic engine is never
 * presented as model judgement.
 */
export function NewsAnalysisSection({ ticker }: { ticker: string }) {
  const [phase, setPhase] = useState<AnalysisPhase>({ state: "idle" });

  // A new ticker resets the section to its resting state — analysis is
  // always an explicit action for the company on screen.
  useEffect(() => {
    setPhase({ state: "idle" });
  }, [ticker]);

  const load = () => {
    setPhase({ state: "loading" });
    apiClient
      .getCompanyNewsAnalysis(ticker)
      .then((data) => {
        if (!data.available) {
          setPhase({ state: "unavailable", reason: data.data_source.label });
        } else {
          setPhase({ state: "ready", data });
        }
      })
      .catch((cause) => {
        setPhase({
          state: "error",
          message:
            cause instanceof ApiError
              ? cause.message
              : "Unexpected error while analysing news.",
        });
      });
  };

  if (phase.state === "idle") {
    return (
      <Panel
        title="Stock market analysis"
        subtitle="Read the last 24 hours of news for sentiment"
      >
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Newspaper className="h-5 w-5 text-muted" aria-hidden="true" />
          <p className="max-w-md text-[13px] leading-relaxed text-muted">
            Fetch every story published about {ticker} in the last 24 hours
            and see how positive or negative the coverage reads — overall
            and article by article, with the reasons why.
          </p>
          <Button onClick={load}>
            <Newspaper className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            Stock market analysis
          </Button>
        </div>
      </Panel>
    );
  }

  if (phase.state === "loading") {
    return (
      <Panel title="Stock market analysis">
        <div aria-busy="true">
          <Skeleton className="h-64" />
        </div>
      </Panel>
    );
  }

  if (phase.state === "unavailable") {
    return (
      <Panel title="Stock market analysis">
        <UnavailableState
          title="News analysis not available"
          detail={phase.reason}
        />
      </Panel>
    );
  }

  if (phase.state === "error") {
    return (
      <Panel title="Stock market analysis">
        <ErrorState
          title="News analysis failed"
          detail={phase.message}
          onRetry={load}
        />
      </Panel>
    );
  }

  const { data } = phase;
  const overall = data.overall;
  const engine = data.sentiment_engine;
  if (!overall) return null;

  return (
    <Panel
      title="Stock market analysis"
      subtitle={`Sentiment across ${data.article_count} ${
        data.article_count === 1 ? "story" : "stories"
      } \u00b7 last ${data.window_hours} hours`}
      actions={
        <Button variant="ghost" onClick={load} aria-label="Refresh analysis">
          <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </Button>
      }
    >
      {/* Overall verdict: label, split bar, and the honest why. */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={toneFor(overall.label)}>{overall.label}</Badge>
        <div
          className="flex h-2.5 min-w-[200px] flex-1 overflow-hidden rounded-full bg-subtle"
          role="img"
          aria-label={`${overall.positive_pct}% positive, ${overall.negative_pct}% negative, ${overall.neutral_pct}% neutral`}
        >
          <div className="bg-change-up" style={{ width: `${overall.positive_pct}%` }} />
          <div className="bg-change-down" style={{ width: `${overall.negative_pct}%` }} />
          <div className="bg-muted" style={{ width: `${overall.neutral_pct}%` }} />
        </div>
        <p className="text-[12px] tabular-nums text-muted">
          {overall.positive_pct}% positive · {overall.negative_pct}%
          negative · {overall.neutral_pct}% neutral
        </p>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed">{overall.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {engine && (
          <Badge tone={engine.degraded ? "down" : "outline"}>
            {engine.label}
          </Badge>
        )}
        <Badge tone={data.data_source.degraded ? "down" : "outline"}>
          {data.data_source.label}
        </Badge>
        <Badge tone="muted">as of {new Date(data.as_of).toLocaleTimeString()}</Badge>
      </div>

      {/* Per-article verdicts. */}
      <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
        {data.articles.map((article, index) => (
          <li key={`${article.url}-${index}`} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Badge tone={toneFor(article.sentiment.label)}>
                  {article.sentiment.label}
                </Badge>
                <span className="text-[11px] tabular-nums text-muted">
                  {Math.round(article.sentiment.confidence * 100)}% confidence
                </span>
              </div>
              <span className="text-[11px] text-muted">
                {article.source} ·{" "}
                {new Date(article.published_at).toLocaleString()}
              </span>
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-start gap-1 text-[13px] underline underline-offset-2"
            >
              {article.title}
              <ArrowUpRight
                className="mt-0.5 h-3 w-3 shrink-0"
                aria-hidden="true"
              />
            </a>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              {article.sentiment.reason}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
