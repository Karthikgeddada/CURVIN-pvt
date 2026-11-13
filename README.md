# CURVIN

Enterprise-grade global company intelligence. CURVIN unifies business,
market, financial and risk insight about companies into one calm,
trustworthy product.

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/` | React + TypeScript + Vite SPA (Tailwind, Motion, Lucide), deployable to Vercel |
| `backend/` | FastAPI application (modular, pytest-tested), `/api/v1` contract |
| `databricks/` | Medallion data platform: ingestion → bronze → silver → gold, intelligence layer, Genie spaces |
| `docs/` | Architecture, product, design system and development workflow |

## Status

Foundation milestone. The repository establishes the monorepo
structure, the frontend and backend foundations, and the Databricks
data platform skeleton. Feature capabilities arrive as independent
milestones — see `docs/product.md`.

## Quick start

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api to :8000
```

## Documentation

- `docs/architecture.md` — system architecture and data flow
- `docs/product.md` — product scope and milestone plan
- `docs/design-system.md` — design principles and tokens
- `docs/development.md` — development workflow and conventions
- `databricks/README.md` — data platform and medallion layers
