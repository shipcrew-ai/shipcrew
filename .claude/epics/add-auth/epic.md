---
name: add-auth
status: backlog
created: 2026-03-03T05:22:28Z
progress: 0%
prd: .claude/prds/add-auth.md
github: https://github.com/shipcrew-ai/shipcrew/issues/13
updated: 2026-03-03T05:28:00Z
---

# Epic: Add JWT Authentication to Backend

## Overview

Add JWT-based email/password authentication to the Express backend and Socket.io layer. This adds a User model, register/login endpoints, an Express middleware that protects all API routes (except health and auth), Socket.io connection auth, and per-user project scoping.

## Architecture Decisions

- **Password hashing**: Node.js built-in `crypto.scrypt` with random 16-byte salt and 64-byte key. Zero new dependencies for hashing.
- **JWT**: `jsonwebtoken` package. 7-day expiry. Secret from `JWT_SECRET` env var.
- **Middleware pattern**: Single `requireAuth` Express middleware applied globally before routers, with path-based skip list (`/health`, `/api/auth/*`).
- **Socket.io auth**: `io.use()` middleware validates token from `socket.handshake.auth.token`.
- **Project scoping**: Add `userId` FK to Project model. Filter projects by `req.user.id` on read, set on create.
- **Seed script**: Updated to create a default user and associate the seeded project with it.

## Technical Approach

### New Files
- `backend/src/auth/hash.ts` — `hashPassword()`, `verifyPassword()` using crypto.scrypt
- `backend/src/auth/jwt.ts` — `signToken()`, `verifyToken()` using jsonwebtoken
- `backend/src/auth/middleware.ts` — `requireAuth` Express middleware + Request type augmentation
- `backend/src/api/auth.ts` — Register, login, me endpoints

### Modified Files
- `backend/prisma/schema.prisma` — Add User model, add userId to Project
- `backend/src/server.ts` — Mount auth middleware + router, Socket.io auth
- `backend/src/api/projects.ts` — Filter by userId on GET, set userId on POST
- `backend/src/db/seed.ts` — Create default user, link to seeded project
- `.env.example` — Add JWT_SECRET

### Frontend (out of scope)
No frontend changes in this epic. The frontend will start getting 401s after this ships — a follow-up epic will add login UI.

## Implementation Strategy

**Single branch, sequential tasks.** The schema change must come first, then auth utilities, then middleware, then endpoint updates. Tasks 1-3 can be parallelized; tasks 4-5 depend on them.

**Testing**: Manual curl commands against running server. No test framework changes needed.

## Task Breakdown Preview

- [ ] Task 1: Add User model to Prisma schema and link to Project
- [ ] Task 2: Create password hashing and JWT utilities
- [ ] Task 3: Install jsonwebtoken dependency
- [ ] Task 4: Create auth middleware and auth API endpoints
- [ ] Task 5: Wire auth into server.ts, update projects.ts, update seed.ts, update .env.example

## Dependencies

- `jsonwebtoken` + `@types/jsonwebtoken` npm packages
- Existing Prisma/SQLite setup
- Node.js `crypto` module (built-in)

## Success Criteria (Technical)

- `GET /health` returns 200 without auth
- `GET /api/projects` returns 401 without auth
- Register → Login → access projects with Bearer token works
- Projects scoped to authenticated user
- Socket.io rejects connections without valid token
- Seed creates a default user with known credentials

## Estimated Effort

- 5 tasks, ~3-4 hours total
- Critical path: #14 → #16 → #17 → #18

## Tasks Created
- [ ] #14 - Add User model to Prisma schema and link to Project (parallel: true)
- [ ] #15 - Create password hashing and JWT utilities (parallel: true)
- [ ] #16 - Create auth middleware and auth API endpoints (parallel: false, depends: #14, #15)
- [ ] #17 - Wire auth into server.ts and add Socket.io auth (parallel: false, depends: #16)
- [ ] #18 - Scope projects to user, update seed, update .env.example (parallel: false, depends: #17)

Total tasks: 5
Parallel tasks: 2 (#14, #15 can run simultaneously)
Sequential tasks: 3 (#16 → #17 → #18)
Estimated total effort: 4.5 hours

## Dependency Graph
```
#14 (Schema) ──┬──→ #16 (Middleware + API) ──→ #17 (Server wiring) ──→ #18 (Projects + Seed)
#15 (Utils)  ──┘
```
