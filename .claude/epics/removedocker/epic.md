---
name: removedocker
status: backlog
created: 2026-03-03T04:05:19Z
progress: 0%
prd: .claude/prds/removedocker.md
github: https://github.com/shipcrew-ai/shipcrew/issues/3
updated: 2026-03-03T04:10:18Z
---

# Epic: Remove Docker Requirement + Switch to SQLite

## Overview

Replace the PostgreSQL + Redis Docker requirement with SQLite for local development. The change is purely a Prisma provider swap plus a thin JSON serialization layer for two array fields on the Agent model. No new dependencies, no feature changes, no migration tooling.

## Architecture Decisions

- **SQLite via Prisma** — Prisma natively supports SQLite as a datasource provider. Switching is a one-line change in `schema.prisma`. All existing Prisma queries work unchanged.
- **JSON-encoded arrays instead of `String[]`** — SQLite doesn't support array columns. The two affected fields (`Agent.skills`, `Agent.channels`) become `String` columns storing JSON arrays. A small helper (`parseJsonArray` / `toJsonString`) handles serialization at the read/write boundary.
- **No runtime provider switching** — The provider is a build-time choice via `DATABASE_URL` in `.env`. SQLite for local dev, PostgreSQL for production. Not both at once.
- **Auto-setup on first run** — The `dev` script detects if `backend/prisma/dev.db` exists; if not, it runs setup (env copy, generate, push, seed) before starting servers.

## Technical Approach

### Database Layer (Prisma)
- Change `datasource db` provider from `postgresql` to `sqlite`
- Change `Agent.skills` and `Agent.channels` from `String[]` to `String @default("[]")`
- No other models are affected — all other fields are scalar types compatible with SQLite

### Serialization Helper
- New file: `backend/src/lib/json-fields.ts`
- `parseJsonArray(value)` — handles both string (from SQLite) and array (from PostgreSQL or in-memory) inputs
- `toJsonString(arr)` — wraps `JSON.stringify`
- Used at every DB read/write boundary for agent skills and channels

### Backend Code Updates
- 7 files need the helper applied at their DB interaction points
- All changes are mechanical: wrap writes with `toJsonString()`, wrap reads with `parseJsonArray()`

### Infrastructure Cleanup
- Remove Redis from `docker-compose.yml` (unused)
- Remove `REDIS_URL` from `.env.example`
- Add comment marking `docker-compose.yml` as optional for production

### Developer Experience
- Add `setup` script to root `package.json`
- Update `dev` script with auto-setup guard
- Simplify README Quick Start to 4 steps

## Implementation Strategy

**Single-pass implementation** — all changes are tightly coupled (schema change requires code changes requires config changes). Ship as one atomic set of changes, not phased.

**Testing approach:**
1. Delete any existing `backend/prisma/dev.db`
2. Run `npm run dev` — verify auto-setup creates DB and seeds
3. Open `localhost:3000` — verify app loads with seeded project
4. Send a message — verify agent routing works (channels field parsed correctly)
5. Check task board — verify tasks render
6. Check file panel — verify sandbox works

## Task Breakdown

- [ ] Task 1: Switch Prisma schema to SQLite and convert array fields to JSON strings
- [ ] Task 2: Create JSON field helper (`backend/src/lib/json-fields.ts`)
- [ ] Task 3: Update backend code to use JSON helper for agent skills/channels (all 7 files)
- [ ] Task 4: Clean up infrastructure — remove Redis, update `.env.example`, update `docker-compose.yml`
- [ ] Task 5: Add auto-setup scripts to root `package.json`
- [ ] Task 6: Update README.md with simplified Quick Start and Advanced PostgreSQL section

## Dependencies

- **None** — this change removes dependencies (Docker, Redis) rather than adding them
- Prisma SQLite support is built-in
- All changes are internal to this repo

## Success Criteria (Technical)

- `npm run dev` on a fresh clone (after `npm install` + API key in `.env`) starts the app with no errors
- No `docker` or `docker compose` commands needed
- All 5 default agents appear in the UI with correct skills and channel assignments
- Sending a message routes to the correct agent (channels parsed from JSON)
- Task creation/update works
- File sandbox works
- Existing `docker-compose.yml` still works if someone wants PostgreSQL

## Tasks Created
- [ ] #4 - Switch Prisma schema to SQLite with JSON array fields (parallel: false)
- [ ] #5 - Create JSON field helper for array serialization (parallel: true)
- [ ] #6 - Update backend code to use JSON helper for agent skills/channels (parallel: false, depends: #4, #5)
- [ ] #7 - Remove Redis and update infrastructure config (parallel: true)
- [ ] #8 - Add auto-setup scripts to root package.json (parallel: true, depends: #4)
- [ ] #9 - Update README with simplified Quick Start (parallel: true, depends: #7, #8)

Total tasks: 6
Parallel tasks: 4
Sequential tasks: 2
Estimated total effort: 4 hours

## Dependency Graph
```
#4 (Schema) ──┬──→ #6 (Backend code) ──→ [done]
#5 (Helper) ──┘
#7 (Infra)  ──────→ #9 (README)
#8 (Scripts) ─────→ #9 (README)
```
