# Deployment

Production topology: the React frontend deploys on **Vercel**, the
FastAPI backend on **Render**, from branch `main` of
`Karthikgeddada/CURVIN-pvt`.

- Frontend: https://curvin-pvt.vercel.app
- Backend: https://curvin-pvt.onrender.com
- Health check: https://curvin-pvt.onrender.com/api/v1/health

## Vercel — frontend environment variables

Set this variable in the Vercel project (Settings → Environment
Variables), in **Production**, **Preview** and **Development**:

| Key | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://curvin-pvt.onrender.com` |

After adding or changing the variable, **redeploy** — Vite embeds
`VITE_` variables into the client bundle at build time, so a change
only takes effect on a fresh build.

Locally, leave `VITE_API_BASE_URL` empty: the Vite dev server proxies
`/api` to `http://localhost:8000` (see `frontend/vite.config.ts`).

## Render — backend configuration

- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  (Render injects `PORT`.)
- Root directory: `backend/` (install `requirements.txt`).
- `CURVIN_ENVIRONMENT=production` — disables `/docs`, keeps error
  responses safe.
- CORS: allowed origins default to the production Vercel frontend plus
  local dev servers; override with `CURVIN_CORS_ORIGINS` (comma-
  separated) if additional origins are needed. Wildcard origins are
  never used with credentials enabled.
- After a push to `main`, confirm automatic deployment completes and
  the service status returns to **Live**.

## Post-deployment verification

1. `https://curvin-pvt.onrender.com/api/v1/health` returns
   `{"status": "ok", ...}`.
2. The frontend loads at `https://curvin-pvt.vercel.app`.
3. The home page health indicator turns green ("Backend · production").
4. Browser network tab: requests go to `curvin-pvt.onrender.com`, no
   CORS errors, no localhost requests.
