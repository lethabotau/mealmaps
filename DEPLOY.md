# Deploy MealMap on Railway

MealMap runs as a **single Railway service**: Express serves the API and the built Vite frontend from one port.

## Railway setup

1. **Create a project** in [Railway](https://railway.app) and connect this GitHub repository.
2. **Service type:** Web service (Node.js).
3. **Build command:**
   ```bash
   npm install && npm run build
   ```
4. **Start command:**
   ```bash
   npm run start
   ```
   Railway sets `PORT` automatically. The backend listens on `process.env.PORT` (fallback `3001` locally).

### Build order

Root `npm run build` runs:

1. `shared` — TypeScript compile
2. `frontend` — `tsc -b && vite build` → `frontend/dist/`
3. `backend` — `tsc` → `backend/dist/`

In production (`NODE_ENV=production`), Express serves `frontend/dist/` as static files and falls back to `index.html` for non-`/api` routes (SPA routing).

## Environment variables

Set these in the Railway service **Variables** tab. Names only — use your own secret values.

| Variable | Required | Notes |
|----------|----------|--------|
| `NODE_ENV` | Yes | Set to `production`. |
| `CLERK_SECRET_KEY` | Yes | Clerk backend secret. |
| `CLERK_PUBLISHABLE_KEY` | Yes | Same publishable key as the frontend. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | **Must be present at build time.** Vite inlines this into the frontend bundle during `npm run build`. |
| `ANTHROPIC_API_KEY` | Optional | LLM paste extraction + event classification. Without it, extract/ingest use regex/keyword fallbacks. |
| `ALGOLIA_SEARCH_KEY` | Optional | Algolia search-only key for boot/manual ingest. Without it, ingest is skipped (server still starts). |
| `INGEST_SECRET` | Recommended | Shared secret for `POST /api/ingest` (`x-ingest-secret` header). |
| `DATA_FILE` | Recommended | Path to the JSON ticket store on disk (see volume below). |

Optional:

| Variable | Default | Notes |
|----------|---------|--------|
| `PORT` | `3001` | Railway injects this; do not hardcode in app code. |
| `SEED_ON_BOOT` | off | Set to `true` only if you want demo seed tickets on a fresh empty store. |

### Build-time vs runtime

- **`VITE_CLERK_PUBLISHABLE_KEY`** — Railway must expose this during the **build** phase, not only at runtime. If it is missing at build, the app shows “Clerk key missing” in the browser even if you add the variable later.
- All other variables are read at **runtime** by the backend (and Clerk/Anthropic/Algolia as used).

## Persistent ticket store (volume)

Ticket data is stored in a JSON file (default `./data/store.json` relative to the backend working directory).

1. In Railway, **add a Volume** to the service.
2. Mount it (e.g. `/data`).
3. Set **`DATA_FILE=/data/store.json`** (or another path inside the mount).

On deploy, the store survives restarts. On `SIGTERM`, the backend flushes pending writes before exit.

## What gets served

| Path | Handler |
|------|---------|
| `/health` | API health check |
| `/api/*` | REST API |
| `/assets/*`, `/favicon.svg`, … | Static files from `frontend/dist/` |
| Any other `GET` | `index.html` (SPA) |

The frontend API client uses **relative** paths (`/api/tickets`, `/health`, …). No localhost URLs in production.

CORS is enabled only when `NODE_ENV !== "production"`.

## Boot ingest

On startup, if the store has no auto-ingested tickets, the server kicks off ingest in the background. Failures (missing Algolia key, network errors, Anthropic timeouts) are logged and **do not** crash the process.

## Local production smoke test

From the repo root:

```bash
npm run build
NODE_ENV=production PORT=3001 DATA_FILE=/tmp/mealmap-store.json npm run start
```

Then verify (see smoke checklist below). Stop with `Ctrl+C` — watch for `[mealmap] SIGINT — flushing store…`.

## Smoke test checklist

After `npm run build && npm run start` (or a Railway deploy URL):

- [ ] **`GET /health`** → `200` with `{ "ok": true, ... }`
- [ ] **`GET /`** → `200`, HTML contains `MealMap` and `/assets/…` script/css links
- [ ] **`GET /assets/<bundle>.js`** → `200`, JavaScript (not `index.html`)
- [ ] **`GET /favicon.svg`** → `200`, SVG with red `#E5431E` mark
- [ ] **`GET /api/tickets`** → `200`, JSON with `tickets`, `overrides`, `confirm`, `reports`
- [ ] **Browser:** open `/` — dashboard loads, ticket cards render, no console errors about failed API fetches
- [ ] **SPA routing:** refresh on a client-only view (if applicable) still loads the app
- [ ] **Persistence:** `POST /api/tickets` (with valid Clerk session) creates a ticket; restart server; ticket still listed
- [ ] **Boot without Algolia:** unset `ALGOLIA_SEARCH_KEY` — server starts, logs ingest skip, `/health` still OK
- [ ] **Sign in:** Clerk modal opens; publishable key was baked in at build (`VITE_CLERK_PUBLISHABLE_KEY`)
