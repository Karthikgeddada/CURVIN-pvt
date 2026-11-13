# Data tests

Quality assurance for the data platform:

- **Contract tests** — gold schemas match what the backend expects.
- **Expectation tests** — SDP expectations hold on known fixture data,
  including deliberately bad records.
- **Freshness tests** — pipelines advance within their cadence.

Tests run with the same SDP pipeline definitions used in production
against fixture data, so a passing test means the real pipeline will
enforce the same rules.

No data tests exist yet; add them beside the tables they protect.
