# Databricks Data Platform

CURVIN's data platform follows the medallion architecture. Each layer
has a single responsibility and a clear contract with the next:

```
ingestion/  →  bronze/  →  silver/  →  gold/  →  intelligence/  →  genie/
   (land)      (raw)     (conformed) (curated)  (insight)      (conversational)
```

| Layer | Responsibility |
| --- | --- |
| `ingestion/` | Connect to external sources and land raw data — Lakeflow Connect pipelines, Auto Loader, batch loads |
| `bronze/` | Immutable raw records, append-only, source-faithful schemas |
| `silver/` | Cleaned, deduplicated, conformed entities with enforced data-quality expectations |
| `gold/` | Curated business tables and metrics — the contract consumed by products |
| `intelligence/` | Analytical and ML models, entity resolution, scoring and enrichment built on gold |
| `genie/` | Genie space definitions and curated semantic context for natural-language Q&A |
| `tests/` | Data quality tests, pipeline tests and fixture data |

## Conventions

- Pipelines are authored as Lakeflow Spark Declarative Pipelines (SDP).
- Table ownership and schemas live in Unity Catalog; every table is
  governed, tagged and documented.
- Each layer's README documents its tables as they are introduced; no
  placeholder files.
