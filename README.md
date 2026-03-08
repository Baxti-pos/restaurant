# Restaurant (Baxti POS) Monorepo

Enterprise-grade documentation for local development, operations handoff, and production readiness of the `restaurant` monorepo.

## Overview

This repository contains a restaurant/POS system split into two deployable applications:

- `backend/` - Node.js + TypeScript + Express + Prisma + PostgreSQL + Socket.IO
- `frontend/` - React + TypeScript + Vite (Tailwind-enabled)

The backend exposes REST APIs (route groups mounted at root paths like `/auth`, `/orders`, `/reports`) plus a `/health` endpoint and Socket.IO events for branch-scoped realtime updates.

The frontend currently includes a Vite dev proxy for `/api` -> backend, but much of the UI logic is still wired to local mock data (`frontend/src/lib/api.ts`), so not all screens hit the backend yet.

## Repository Structure

```text
restaurant/
|-- README.md
|-- backend/
|   |-- package.json
|   |-- tsconfig.json
|   |-- .env.example
|   |-- prisma/
|   |   |-- schema.prisma
|   |   |-- seed.ts
|   |   `-- migrations/
|   `-- src/
|       |-- app.ts
|       |-- server.ts
|       |-- config.ts
|       |-- prisma.ts
|       |-- modules/
|       |   |-- auth/
|       |   |-- branches/
|       |   |-- categories/
|       |   |-- expenses/
|       |   |-- me/
|       |   |-- orders/
|       |   |-- products/
|       |   |-- reports/
|       |   |-- tables/
|       |   `-- waiters/
|       `-- socket/
`-- frontend/
    |-- package.json
    |-- vite.config.ts
    `-- src/
```

## Architecture Summary

### Backend

- Express app initializes middleware + route modules in `backend/src/app.ts`
- HTTP server + Socket.IO server are bootstrapped in `backend/src/server.ts`
- Prisma is the data access layer for PostgreSQL
- JWT-based auth is implemented in `backend/src/modules/auth/*`
- Socket.IO supports branch-room subscriptions (example event: `join_branch`)

### Frontend

- Vite + React SPA
- Tailwind CSS and chart/UI helper libraries (e.g. `recharts`, `lucide-react`, `sonner`)
- Vite proxy rewrites `/api/*` to backend root (`http://localhost:3000/*`)
- Current data layer is primarily mock/in-memory (`frontend/src/lib/api.ts`)

## Tech Stack

### Backend

- Node.js (recommended: 20+)
- TypeScript
- Express 4
- Prisma ORM
- PostgreSQL
- Socket.IO
- JWT (`jsonwebtoken`)
- Password hashing (`bcryptjs`)

### Frontend

- React 18
- TypeScript
- Vite 5
- Tailwind CSS

## Prerequisites

Before running locally (without Docker), ensure you have:

- Node.js 20+ and `npm`
- PostgreSQL installed and running locally
- A PostgreSQL user with permission to create/use databases

Optional but recommended:

- `psql` and `createdb` CLI tools

## Local Development (No Docker)

This project can run fully on your machine without Docker. The backend assumes a local PostgreSQL instance.

### 1. Install Dependencies

```bash
cd backend && npm i
cd ../frontend && npm i
```

### 2. Create the Local Database

Create the `baxti_pos` database (adjust credentials if your local PostgreSQL user/password are different):

```bash
PGPASSWORD=postgres createdb -h localhost -p 5432 -U postgres baxti_pos
```

If the database already exists, you can reuse it.

### 3. Configure Backend Environment

Create `backend/.env` from `backend/.env.example`:

```bash
cd backend
cp .env.example .env
```

Minimum local `.env` (recommended):

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
JWT_SECRET=some_long_secret
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/baxti_pos?schema=public
SHIFT_ENFORCE=false
```

Notes:

- Replace `USER:PASSWORD` with your actual PostgreSQL credentials.
- `SHIFT_ENFORCE` is included for local configuration compatibility (may be reserved for business logic enforcement).

### 4. Prisma Setup (Generate, Migrate, Seed)

From `backend/`:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

Alternative (development-only schema sync):

```bash
npx prisma db push
```

Important:

- Prefer `migrate dev` for tracked schema history.
- `db push` is useful for rapid local prototyping, but running `db push` and then `migrate dev` can trigger Prisma drift warnings.

### 5. Run Backend (Terminal 1)

```bash
cd backend
npm run dev
```

Expected startup log:

```text
Server ishga tushdi: http://localhost:3000
```

Health check:

```bash
curl -s http://localhost:3000/health
```

### 6. Run Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Expected local URL (Vite):

- `http://localhost:5173/`

If `5173` is busy, Vite may choose another port automatically.

### 7. Verify Frontend -> Backend Proxy

Vite dev proxy is configured in `frontend/vite.config.ts`:

- `/api/*` requests proxy to `http://localhost:3000`
- `/api` prefix is rewritten out before reaching Express

Quick proxy check:

```bash
curl -s http://localhost:5173/api/health
```

Expected response:

```json
{"status":"ok","service":"baxti-pos-backend","timestamp":"..."}
```

## Environment Variables (Backend)

The backend reads environment variables from `backend/.env` (directly and via `backend/src/config.ts`).

| Variable | Required | Example | Purpose |
|---|---:|---|---|
| `PORT` | Yes | `3000` | Backend HTTP port |
| `NODE_ENV` | Yes | `development` | Runtime mode |
| `CORS_ORIGIN` | Yes | `*` or `http://localhost:5173` | CORS policy for REST + Socket.IO |
| `JWT_SECRET` | Yes | `some_long_secret` | JWT signing secret |
| `DATABASE_URL` | Yes | `postgresql://user:pass@localhost:5432/baxti_pos?schema=public` | Prisma/PostgreSQL connection string |
| `SHIFT_ENFORCE` | Optional/Reserved | `false` | Shift policy toggle (business rule flag) |

## API Overview

### Health

- `GET /health` - service health status

Note:

- Backend routes are mounted at root (no `/api` prefix in Express)
- In local Vite development, `/api/*` works because of proxy + rewrite

### Route Groups (Express)

Mounted in `backend/src/app.ts`:

- `/auth`
- `/branches`
- `/waiters`
- `/categories`
- `/products`
- `/tables`
- `/orders`
- `/expenses`
- `/reports`
- `/me`

### Authentication

- JWT bearer auth (`Authorization: Bearer <token>`)
- Login endpoint:
  - `POST /auth/login`
- Branch selection (owner):
  - `POST /auth/select-branch`

## Realtime (Socket.IO)

Socket.IO is initialized on the same backend HTTP server.

Current event behavior includes:

- Server emits `connected` on client connect
- Client can emit `join_branch` with `branchId`
- Server joins the socket to room `branch:<branchId>`
- Server emits `joined_branch` confirmation

This supports branch-scoped broadcasting (e.g., orders, tables, notifications).

## Seed Data and Demo Credentials

The seed script (`backend/prisma/seed.ts`) inserts sample data for local development:

- Branch: `Chilonzor filiali`
- Owner phone: `+998901234567`
- Owner password: `admin123`
- Telegram waiter user ID: `111111111`
- Sample tables and products

Use these credentials only for local development.

## Frontend Integration Status (Important)

The frontend currently ships with a mock API layer:

- `frontend/src/lib/api.ts` uses in-memory data and artificial delays
- Many UI screens do not yet call the backend APIs directly

What is already prepared:

- Vite proxy (`/api` -> backend) in `frontend/vite.config.ts`

Implication:

- `curl http://localhost:5173/api/health` validates proxy/network path
- UI functionality may still show mock data until `frontend/src/lib/api.ts` is replaced with real HTTP requests

## Scripts Reference

### Backend (`backend/package.json`)

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `tsx watch src/server.ts` | Start backend in watch mode |
| `npm run build` | `tsc -p tsconfig.json` | Build backend TS -> JS |
| `npm start` | `node dist/src/server.js` | Run built backend |
| `npm run prisma:migrate` | `prisma migrate dev` | Run Prisma dev migrations |
| `npm run prisma:seed` | `tsx prisma/seed.ts` | Seed local database |

### Frontend (`frontend/package.json`)

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `npx vite` | Start Vite dev server |
| `npm run build` | `npx vite build` | Production build |
| `npm run preview` | `npx vite preview` | Preview production build |
| `npm run lint` | `eslint . --ext .js,.jsx,.ts,.tsx` | Lint frontend code |

## Troubleshooting

### PostgreSQL connection fails

Symptoms:

- Prisma commands fail (`db push`, `migrate dev`, `generate` with DB access)

Actions:

- Confirm PostgreSQL service is running locally
- Verify `DATABASE_URL` user/password/host/port/database
- Check the database exists (`baxti_pos`)
- Try connecting manually:

```bash
PGPASSWORD=<password> psql -h localhost -U <user> -d baxti_pos -p 5432
```

### Prisma drift after `db push`

If you run `npx prisma db push` and then `npx prisma migrate dev --name init`, Prisma may report drift.

Recommended fix (local dev only):

- Reset/recreate the local database, then run:
  - `npx prisma migrate dev --name init`
  - `npm run prisma:seed`

### `/api/health` returns 404 on backend directly

This is expected.

- Backend endpoint is `GET /health`
- `/api/health` only works from Vite dev server because proxy rewrites `/api` away

### Frontend starts but data does not match backend DB

This is likely because the frontend is still using mock data in `frontend/src/lib/api.ts`.

## Production Readiness Notes

Use this project as a base, but apply the following before production rollout:

- Replace `CORS_ORIGIN=*` with a strict allowlist
- Store secrets in a secret manager (not plain `.env` in source control)
- Rotate `JWT_SECRET` and use a strong random value
- Run Prisma migrations in CI/CD (`prisma migrate deploy` for production)
- Add structured logging (request IDs, correlation IDs)
- Add centralized monitoring and alerts (metrics, logs, error tracking)
- Add rate limiting and request validation at API boundaries
- Put backend behind a reverse proxy / load balancer (TLS termination)
- Serve frontend from CDN/static hosting with environment-specific API config
- Implement backups and restore drills for PostgreSQL

## Recommended Next Steps

1. Replace `frontend/src/lib/api.ts` mock layer with real HTTP client calls to backend endpoints.
2. Add a root-level script runner (e.g., `concurrently`) to start backend + frontend together.
3. Add CI checks for lint, build, and Prisma migration validation.
4. Document API contracts (OpenAPI/Swagger) for frontend-backend integration.

## License

No license file is currently present in this repository. Add a `LICENSE` file and ownership policy before external distribution.
