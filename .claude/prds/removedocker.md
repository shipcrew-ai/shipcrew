---
name: removedocker
description: Remove Docker requirement for local dev by switching from PostgreSQL to SQLite via Prisma and eliminating unused Redis dependency
status: backlog
created: 2026-03-03T04:04:02Z
---

# PRD: Remove Docker Requirement + Switch to SQLite

## Executive Summary

ShipCrew currently requires Docker to run PostgreSQL and Redis for local development. Redis is completely unused in the backend code (zero imports, zero references). PostgreSQL is used via Prisma ORM, which supports SQLite as a provider. This PRD covers switching the default local dev database to SQLite (zero-dependency, file-based) and removing the Redis dependency entirely, making the app runnable with `npm install && npm run dev` — no Docker needed. Docker remains as an optional production path for PostgreSQL.

## Problem Statement

- **Docker is a barrier to onboarding.** New contributors must install Docker Desktop, understand Docker Compose, and wait for containers to start before they can even try the app.
- **Redis is dead weight.** It's declared in `docker-compose.yml` and `.env.example` but never imported or referenced in backend code.
- **PostgreSQL is overkill for local dev.** The app uses standard Prisma ORM queries with no PostgreSQL-specific features that SQLite can't handle.
- **The setup flow has 5 steps** (clone, docker compose, env, db:push + db:seed, npm run dev). It should be 3: clone, install, run.

## User Stories

### US-1: New contributor quick start
**As a** new contributor, **I want to** run the app with just `npm install` and `npm run dev`, **so that** I can start exploring and contributing without installing Docker.

**Acceptance Criteria:**
- No Docker required for local development
- Database auto-creates on first `npm run dev`
- Seed data loads automatically on first run
- App is fully functional at `http://localhost:3000`

### US-2: Existing contributor migration
**As an** existing contributor, **I want to** switch from Docker/PostgreSQL to SQLite seamlessly, **so that** I don't need to maintain Docker containers.

**Acceptance Criteria:**
- Delete `backend/prisma/dev.db` and re-run `npm run dev` to get a fresh database
- No manual migration steps required
- All existing features (agents, channels, tasks, file ops) work identically

### US-3: Production PostgreSQL option
**As a** deployer, **I want to** optionally use PostgreSQL in production, **so that** I get production-grade database reliability.

**Acceptance Criteria:**
- `docker-compose.yml` still works for PostgreSQL
- Changing `DATABASE_URL` to a PostgreSQL connection string works
- Documentation explains both paths

## Requirements

### Functional Requirements

#### FR-1: Prisma schema changes
- Change datasource provider from `postgresql` to `sqlite`
- Change `DATABASE_URL` default to `file:./prisma/dev.db`
- Convert `Agent.skills` from `String[]` to `String @default("[]")` (JSON-encoded)
- Convert `Agent.channels` from `String[]` to `String @default("[]")` (JSON-encoded)

#### FR-2: JSON field helper
- Create `backend/src/lib/json-fields.ts` with:
  - `parseJsonArray(value: string | string[]): string[]` — parse JSON string to array, passthrough if already array, fallback to `[]`
  - `toJsonString(arr: string[]): string` — `JSON.stringify` the array

#### FR-3: Backend code updates
Update all files that read/write agent `skills` and `channels`:
- `backend/src/api/projects.ts` — `JSON.stringify` arrays when creating agents
- `backend/src/api/agents.ts` — parse on read, stringify on write
- `backend/src/orchestration/router.ts` — parse `channels` before `.includes()` check
- `backend/src/orchestration/executor.ts` — parse agent data
- `backend/src/agents/config.ts` — parse skills/channels when building config
- `backend/src/mcp/tools.ts` — parse agent channels
- `backend/src/db/seed.ts` — stringify arrays when seeding

#### FR-4: Remove Redis
- Remove `REDIS_URL` from `.env.example`
- Remove Redis service from `docker-compose.yml`
- Add comment to `docker-compose.yml` noting it's optional for production PostgreSQL

#### FR-5: Auto-setup on first run
- Add `setup` script to root `package.json`: copies `.env.example` to `.env` (if missing), generates Prisma client, pushes schema, seeds database
- Update `dev` script to auto-run setup if `backend/prisma/dev.db` doesn't exist

#### FR-6: Update documentation
- Simplify README Quick Start to: clone → install → add API key → `npm run dev`
- Move Docker/PostgreSQL instructions to an "Advanced: PostgreSQL" section
- Update environment variables table (remove `REDIS_URL`, update `DATABASE_URL` default)

### Non-Functional Requirements

- **Zero new dependencies** — SQLite is built into Prisma, no additional packages needed
- **Backwards compatible** — changing `DATABASE_URL` back to a PostgreSQL connection string should still work (JSON fields are valid in both databases)
- **No data migration** — this is for local dev; there is no production data to migrate

## Success Criteria

| Metric | Target |
|--------|--------|
| Setup steps for new contributor | 3 (clone, install, run) |
| External service dependencies for local dev | 0 (no Docker, no external DB) |
| Time from clone to running app | < 2 minutes |
| Existing feature parity | 100% — all agents, channels, tasks, files, streaming work identically |

## Constraints & Assumptions

- **SQLite limitations are acceptable for local dev.** No concurrent write-heavy workloads in single-user dev mode.
- **Array fields only exist on Agent model.** Only `skills` and `channels` use `String[]`; all other models use scalar types compatible with SQLite.
- **Redis is truly unused.** Confirmed zero imports/references in backend code. If future features need Redis, it can be re-added.
- **Prisma supports SQLite provider switching.** The datasource `provider` field can be changed without affecting query syntax.

## Out of Scope

- **Production deployment changes** — this PRD only covers local development setup
- **Data migration tooling** — no existing production data to migrate
- **Adding new features** — purely infrastructure simplification
- **Prisma Migrate adoption** — continue using `db push` for simplicity
- **Multi-database provider support at runtime** — not switching providers dynamically; it's a build-time choice via `.env`

## Dependencies

- **Prisma SQLite support** — built-in, no additional packages
- **No external dependencies** — this change removes dependencies rather than adding them

## Files to Change

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Provider → sqlite, String[] → String |
| `backend/src/lib/json-fields.ts` | New helper file |
| `backend/src/api/projects.ts` | Stringify arrays on agent create |
| `backend/src/api/agents.ts` | Parse/stringify skills & channels |
| `backend/src/orchestration/router.ts` | Parse channels before `.includes()` |
| `backend/src/orchestration/executor.ts` | Parse agent data |
| `backend/src/agents/config.ts` | Parse skills/channels in config builder |
| `backend/src/mcp/tools.ts` | Parse agent channels |
| `backend/src/db/seed.ts` | Stringify arrays on seed |
| `.env.example` | SQLite default, remove Redis |
| `docker-compose.yml` | Remove Redis, add optional comment |
| `package.json` | Add setup script, update dev script |
| `README.md` | Simplify Quick Start, add Advanced section |
