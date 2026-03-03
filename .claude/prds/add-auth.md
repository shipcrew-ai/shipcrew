---
name: add-auth
description: Add JWT-based email/password authentication to the backend API and Socket.io
status: backlog
created: 2026-03-03T05:21:34Z
---

# PRD: add-auth

## Executive Summary

Add JWT-based email/password authentication to the ShipCrew backend. Currently there is zero authentication — any HTTP request or Socket.io connection can access everything. This adds user registration, login, token-based API protection, and per-user project scoping.

## Problem Statement

ShipCrew's backend is completely open. Any client can read/write all projects, channels, tasks, and messages without any identity or access control. This is a blocker for any multi-user or hosted deployment. Authentication is the foundation for all future access control.

## User Stories

### Developer (self-hosted)
- As a developer, I want to register an account so that my projects are protected from unauthorized access.
- As a developer, I want to log in and receive a token so that I can make authenticated API calls.
- As a developer, I want only my projects to be visible to me, not other users' projects.
- **Acceptance criteria**: Register, login, receive JWT, access only own projects, get 401 without token.

### API Consumer
- As an API consumer, I want unauthenticated requests to be rejected with 401 so that the API is secure by default.
- As an API consumer, I want the health endpoint to remain public so that monitoring works without credentials.
- **Acceptance criteria**: `GET /health` returns 200 without auth. `GET /api/projects` returns 401 without auth.

## Requirements

### Functional Requirements

1. **User model** — `User` table with id, email (unique), passwordHash, name, createdAt. Projects linked to users via `userId` foreign key.
2. **Registration** — `POST /api/auth/register` with email, password (min 6 chars), name. Returns JWT + user info. 409 on duplicate email.
3. **Login** — `POST /api/auth/login` with email, password. Returns JWT + user info. 401 on invalid credentials.
4. **Token verification** — `GET /api/auth/me` returns authenticated user info.
5. **API protection** — Express middleware rejects requests without valid `Authorization: Bearer <token>` header. Skips `/health` and `/api/auth/*`.
6. **Socket.io protection** — Connection middleware validates token from `socket.handshake.auth.token`. Rejects unauthenticated connections.
7. **Project scoping** — `GET /api/projects` returns only the authenticated user's projects. `POST /api/projects` associates new projects with the authenticated user.

### Non-Functional Requirements

- **Zero new dependencies for hashing** — use Node.js built-in `crypto.scrypt` + `timingSafeEqual`
- **One new dependency** — `jsonwebtoken` + `@types/jsonwebtoken`
- **JWT expiry** — 7 days
- **Default secret** — `shipcrew-dev-secret-change-in-production` via `JWT_SECRET` env var
- **Password storage** — scrypt with random 16-byte salt, 64-byte key, stored as `salt:hash` hex

## Success Criteria

- `curl /health` returns 200 without auth
- `curl /api/projects` returns 401 without auth
- Register → Login → `GET /api/projects` with token returns 200
- Projects are scoped to the authenticated user
- Socket.io connections without token are rejected
- Existing frontend API calls fail with 401 (expected — frontend auth is out of scope)

## Constraints & Assumptions

- SQLite database (no PostgreSQL-specific features)
- Backend only — no frontend login UI in this PRD
- No role-based access control (all authenticated users have equal access)
- No password reset or email verification
- JWT secret is a simple env var, not a key rotation system
- Seed script will need updating to associate the default project with a user (or skip auth during seed)

## Out of Scope

- Frontend login/signup UI
- OAuth providers (Google, GitHub)
- Role-based permissions
- Password reset flow
- Email verification
- Token refresh / rotation
- Rate limiting on auth endpoints
- Account deletion

## Dependencies

- Node.js `crypto` module (built-in)
- `jsonwebtoken` npm package
- Existing Prisma schema + SQLite setup
- Existing Express middleware chain in `server.ts`
