# MealMap — Campus Food Pass

Hackathon starter repo for finding free and cheap food on campus. This refactor replaces the original Claude Design `.dc.html` prototype with a conventional monorepo your team can extend quickly.

## Repo layout

```
mealmap/
├── frontend/          React + Vite UI (port 5174)
├── backend/           Express REST API (port 3001)
├── shared/            Types + business logic used by both sides
└── legacy/            Original Claude Design export (reference only)
```

## Prerequisites

- **Node.js 18+**
- **npm** (workspaces)

## Quick start

```bash
# Install all workspace dependencies
npm install

# Build shared package (required before backend starts)
npm run build -w shared

# Run frontend + backend together
npm run dev
```

Open **http://localhost:5174** — the Vite dev server proxies `/api` to the backend. Check the terminal for the exact port if 5174 is already in use.

### Troubleshooting blank page

1. **No `.env` files** — copy `frontend/.env.example` → `frontend/.env` and `backend/.env.example` → `backend/.env`, add your Clerk keys, restart dev.
2. **Wrong port** — Vite prints the actual URL in the terminal (e.g. `5175` if `5174` is taken). Open that URL.
3. **Backend down** — you'll see "Could not reach the MealMap backend" once Clerk is configured; run `npm run dev` from the `mealmaps/` folder.

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Start backend + frontend concurrently |
| `npm run build` | Build shared, backend, and frontend |
| `npm test` | Run all tests (shared → backend → frontend) |
| `npm run test:backend` | API tests only |
| `npm run test:frontend` | UI + component tests only |

## API (backend)

Base URL: `http://localhost:3001`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/tickets` | List tickets + crowd overrides |
| `POST` | `/api/tickets` | Create a ticket |
| `POST` | `/api/tickets/:id/report` | Crowd report (`still`, `gone`, `queue`, `members`, `all`) |

Ticket data lives in an **in-memory store** seeded from `shared/src/tickets.ts`. Swap `backend/src/store/ticketStore.ts` for a database when you're ready.

## Where to work next

### Frontend (`frontend/src/`)

| Path | Purpose |
|------|---------|
| `App.tsx` | Screen routing + wires hooks to views |
| `components/` | One file per screen/panel (`DashboardView`, `TicketCard`, …) |
| `hooks/useTickets.ts` | Fetches tickets, posts new ones, submits reports |
| `api/client.ts` | Thin fetch wrapper — point `VITE_API_URL` at prod later |

### Backend (`backend/src/`)

| Path | Purpose |
|------|---------|
| `routes/tickets.ts` | HTTP handlers |
| `store/ticketStore.ts` | In-memory persistence — **replace this first** for real DB |
| `app.ts` | Express app factory (used by tests too) |

### Shared (`shared/src/`)

| Path | Purpose |
|------|---------|
| `types.ts` | `Ticket`, `Filters`, etc. |
| `tickets.ts` | Filtering, ranking, paste extraction, seed data |
| `tickets.test.ts` | Unit tests for core logic |

## Environment variables

**Backend**

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | API port |

**Frontend**

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `""` (same origin) | API base URL in production |

## Team workflow tips

1. **Agree on types first** — edit `shared/src/types.ts`, then rebuild shared (`npm run build -w shared`).
2. **Backend changes** — add routes in `backend/src/routes/`, keep store logic separate so you can swap SQLite/Postgres later.
3. **UI changes** — components are split by screen; don't put business logic in JSX — use `shared/` or hooks.
4. **Tests** — add a test when you fix a bug in filtering or paste extraction; those are the highest-value unit tests right now.

## Legacy prototype

The original Claude Design export is in `legacy/` for visual reference. The live app is fully ported to React — you can delete `legacy/` once nobody needs it.
