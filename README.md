# AIGenius (Nobox)

Client monorepo for **AIGenius** — a pay-as-you-go AI chat platform with multi-model support, personas, real-time streaming, and a separate backend API.

## Repository layout

This repo (`ai-genius`) is a **Yarn workspaces monorepo** for client-side packages. The NestJS API lives in **[ai-backend](https://github.com/Akintunde102/ai-backend)** — a separate repo your team can clone on its own.

| Folder / repo | Stack | Role |
|---------------|--------|------|
| **frontend/** | Next.js 13, React 18, TypeScript | Web app (nobox-console). Dev: **http://localhost:3001** |
| **desktop/** | Electron | Linux desktop shell |
| **desktop-server/** | Hono, Node | Local sidecar for desktop search/voice |
| **[ai-backend](https://github.com/Akintunde102/ai-backend)** (separate repo) | NestJS, PostgreSQL, Drizzle | Core API (nobox-core). Dev: **http://localhost:8000** |

Optional: full-stack developers can colocate the API under `backend/` via `npm run backend:clone`. Client-only developers never need that folder.

## Team workflows

Three common setups — pick the one that matches your role.

### Backend team (API only)

Clone and work in **ai-backend** only. You do not need `ai-genius`.

```bash
git clone https://github.com/Akintunde102/ai-backend.git
cd ai-backend
npm install
# env in env/ — see README
npm run dev
```

Push to `main` on `ai-backend`; Azure CI deploys from that repo.

### Client team (frontend, desktop, sidecar)

Clone **[aigenius-main](https://github.com/Akintunde102/aigenius-main)** only. Point the app at a shared dev or staging API — no local Postgres or NestJS required.

```bash
git clone https://github.com/Akintunde102/aigenius-main.git
cd aigenius-main
yarn install
cp frontend/env.example frontend/.env.local
# edit NEXT_PUBLIC_NOBOX_API_ROOT_URL → team dev API URL
npm run dev:frontend
```

Use `npm run desktop:dev` for Electron work. Do **not** run `npm run dev` unless you have cloned the API locally (it falls back to frontend-only if `backend/` is missing).

### Full-stack (all repos)

Clone **[ai-genius](https://github.com/Akintunde102/ai-genius)** — it already contains `backend/`:

```bash
git clone https://github.com/Akintunde102/ai-genius.git
cd ai-genius
yarn install
cd backend && npm install && cd ..
npm run dev
```

Push updates to team repos when ready: `npm run sync:backend` and/or `npm run sync:client`.

### Full-stack: resync child repos

Work in **ai-genius** as usual. When changes should reach the team repos:

```bash
npm run sync:backend    # mirror backend/ → ai-backend
npm run sync:client     # mirror client tree (no backend/) → aigenius-main
```

Optional commit message: `npm run sync:backend -- "fix(auth): token refresh"`. Token is read from repo-root `.env` or `GH_TOKEN`.

One-time clean bootstrap (empty child repos): `npm run publish:initial`

### Git remotes (optional, legacy Vercel subtree)

| Remote | Repository | Deploy target |
|--------|------------|---------------|
| `origin` | `Akintunde102/ai-genius` | Full-stack integration (everything) |
| `frontend-origin` | `Akintunde102/aigenius_frontend` | Legacy Vercel subtree |
| — | `Akintunde102/ai-backend` | Backend team (`npm run sync:backend`) |
| — | `Akintunde102/aigenius-main` | Client team (`npm run sync:client`) |

Child repos are updated via **mirror sync** scripts (not subtree). Legacy subtree push to Vercel: `npm run sync:frontend`.

- **Frontend**: [frontend/README.md](frontend/README.md) — setup, scripts, design system, auth.
- **Backend**: [backend/README.md](backend/README.md) — API, env, DB, migrations, Swagger (also published from `ai-backend`).

## Documentation

- **[Workflows and schedules](docs/workflows-user-guide.md)** — steps, `{{ last }}` / `{{ steps... }}` templates, cron and one-shot schedules, REST API, frontend client, and chat `workflow_agent` (aligned with the current backend implementation).

## Quick start

### Client team (frontend only)

```bash
yarn install
cp frontend/env.example frontend/.env.local   # set API URL to team dev/staging
npm run dev:frontend
```

### Full-stack (API + frontend)

```bash
yarn install
npm run backend:clone   # skip if backend/ already exists
cd backend && npm install && cd ..
npm run dev
```

`npm run dev` starts both servers when `backend/` is present; otherwise it starts frontend only.

### Option A — one terminal (full-stack)

```bash
# From repo root (first time: npm install to get concurrently)
npm install
npm run dev
```

Runs backend and frontend in **one terminal** with [concurrently](https://www.npmjs.com/package/concurrently). Logs are prefixed with `[backend]` and `[frontend]`. Use the IDE **Stop** button or **Ctrl+C** to stop both (“pause”); start again with `npm run dev` (“play”).

### Option B — Shell script

```bash
# From repo root
./scripts/dev.sh
# Or: bash scripts/dev.sh
```

Starts backend in the background, then frontend in the foreground. Ctrl+C stops the frontend and then the backend.

### Run servers separately

- **Backend only** (from repo root): `npm run dev:backend`  
  Or from `backend/`: `npm run dev` or `npm run start:dev`
- **Frontend only** (from repo root): `npm run dev:frontend`  
  Or from `frontend/`: `yarn dev`

## Prerequisites

- **Node.js** 18+ (backend), and Yarn for frontend
- **PostgreSQL** for backend (see [backend/README.md](backend/README.md))
- Backend env in `backend/env/` (e.g. `.local.env` / `.development.env`)
- Frontend env: copy `frontend/env.example` to `frontend/.env.local`

## Root scripts (package.json)

| Script | Description |
|--------|-------------|
| `npm run dev` | Full-stack: API + frontend when `backend/` exists; else frontend only |
| `npm run dev:backend` | API only (requires `backend/` — run `npm run backend:clone` first) |
| `npm run dev:frontend` | Frontend only (client team default) |
| `npm run backend:clone` | Clone `ai-backend` into `backend/` for full-stack local dev |
| `npm run sync:backend` | Mirror `backend/` → [ai-backend](https://github.com/Akintunde102/ai-backend) |
| `npm run sync:client` | Mirror client monorepo (no backend) → [aigenius-main](https://github.com/Akintunde102/aigenius-main) |
| `npm run sync:frontend` | Legacy subtree push to `aigenius_frontend` (Vercel) |
| `npm run publish:initial` | One-time clean bootstrap of child repos |

## URLs when both are running

- **App**: http://localhost:3001  
- **API**: http://localhost:8000 (or port in `backend/env/`)  
- **API docs (Swagger)**: http://localhost:8000/apidocs (if enabled)

## Deploying the frontend (Vercel)

This repo is a monorepo; the Next.js app lives in **`frontend/`**. For Vercel:

1. In the Vercel project, go to **Settings → General**.
2. Under **Root Directory**, set it to **`frontend`** (or `./frontend`).
3. Save and redeploy.

Vercel will then use `frontend/package.json` (which includes `next`) and build the Next.js app correctly.

## License

- Frontend: MIT  
- Backend: see [backend/README.md](backend/README.md) and LICENSE in that folder
