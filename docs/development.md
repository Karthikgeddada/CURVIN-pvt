# Development Workflow

## Setup

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

# Frontend
cd frontend
npm install
```

## Daily loop

```bash
# Backend — run dev server and tests
uvicorn app.main:app --reload --port 8000
pytest

# Frontend — dev server, lint, format, tests
npm run dev
npm run lint
npm run format:check
npm test
```

## Conventions

- **Small, reviewable commits.** One concern per commit, imperative
  subject lines.
- **Tests beside code.** Backend tests in `backend/tests`; frontend
  tests in `frontend/tests`. New endpoints and shared utilities ship
  with tests.
- **No placeholder files.** Directories that exist are documented
  with a README that describes their contract; anything else waits
  until it is real.
- **Secrets never enter the repo.** Copy `.env.example` files to
  `.env`; they are gitignored.
- **Feature modules are isolated.** Frontend features never import
  from each other; backend routers never import each other.

## Adding a backend endpoint

1. Add a router module under `app/api/v1`.
2. Register it in `app/api/v1/__init__.py`.
3. Add tests under `tests/`.

## Adding a frontend page

1. Create the page in `src/pages`.
2. Register the route in `src/app/router.tsx`.
3. Reuse `src/shared` components; add a feature module under
   `src/features` for the capability's real logic.

## Definition of done (per change)

- Backend: `pytest` green.
- Frontend: `npm run lint` clean, `npm test` green, `npm run build`
  succeeds.
- Docs updated if contracts changed.
