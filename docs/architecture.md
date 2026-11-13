# Architecture

## System overview

```
┌──────────────┐        /api/v1         ┌──────────────┐
│   Frontend   │ ⇄────────────────────⇄ │   Backend    │
│ React + Vite │    JSON over HTTPS     │   FastAPI    │
│  (Vercel)   │                        │              │
└──────────────┘                        └──────┬───────┘
                                               │ reads
                                               ▼
                                     ┌──────────────────┐
                                     │  Databricks gold  │
                                     │ (Unity Catalog)   │
                                     └────────▲─────────┘
                                              │ curated from
┌──────────────────────────────────────────────┴─────────────┐
│ Medallion: ingestion → bronze → silver → gold              │
│ + intelligence layer (ML/MLflow) + Genie spaces            │
└────────────────────────────────────────────────────────────┘
```

## Principles

1. **One contract per boundary.** The frontend and backend speak
   only through the versioned `/api/v1` contract; the backend and
   the data platform speak only through documented gold tables.
2. **Thin edges, rich core.** Routers and API clients contain no
   business logic; logic lives in services and the data platform.
3. **Governed data.** Every table is in Unity Catalog with ownership,
   tags and documentation.
4. **Fail loudly, degrade gracefully.** The uniform error envelope
   (`{ "error": { "code", "message" } }`) flows end to end; the
   frontend renders calm states, never stack traces.
5. **Independent deployments.** Frontend deploys to Vercel, backend
   deploys independently, pipelines update independently — no
   big-bang releases.

## Frontend structure

- `src/app` — composition root: providers, router, environment config.
- `src/core` — cross-cutting infrastructure: API client, error
  handling.
- `src/design-system` — tokens and motion vocabulary.
- `src/features` — one module per product capability; never imports
  from another feature.
- `src/pages` — route-level compositions.
- `src/shared` — reusable UI, layouts, types, utilities.

## Backend structure

- `app/main.py` — application assembly (one place).
- `app/core` — config, logging, error handling.
- `app/api/v1` — routers; each new capability adds a module here.
- `tests` — pytest suite; `TestClient` runs the real app.

## Data flow (future)

External sources → ingestion pipelines → bronze (raw, immutable) →
silver (conformed, quality-enforced) → gold (curated business tables)
→ consumed by the backend API and Genie spaces; intelligence-layer
models score and enrich back into governed tables.
