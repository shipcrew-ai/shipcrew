# ShipCrew

AI-powered dev team in a box. Multiple specialized AI agents (PM, Frontend Dev, Backend Dev, Reviewer) collaborate in real-time through a Slack-like interface to build software together.

## What Is This?

ShipCrew is a full-stack platform where AI agents work as a team. Instead of one human talking to one AI, you get a crew of specialized agents that coordinate, delegate tasks, review each other's code, and ship features — all visible in a real-time chat UI.

```
You → Chat with your AI team → They build it together
```

**Agents include:**
- **PM** — breaks down requirements, creates tasks, tracks progress
- **Frontend Dev** — builds UI components with React/Next.js
- **Backend Dev** — writes APIs, database logic, server code
- **Reviewer** — reviews code, catches bugs, suggests improvements

Each agent has its own skills, memory, and budget. They talk to each other in channels, create and assign tasks, and maintain context across sessions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS, Zustand, Socket.io |
| Backend | Express.js, Prisma ORM, Socket.io |
| AI | Anthropic Claude API, Claude Agent SDK |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Sandbox | Docker (isolated per-project containers) |
| Language | TypeScript (monorepo with npm workspaces) |

## Prerequisites

- **Node.js 20+**
- **Anthropic API key** ([get one here](https://console.anthropic.com/))
- **Docker** (optional, only needed for PostgreSQL — see Advanced section)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-username/shipcrew.git
cd shipcrew
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Run the app

```bash
npm run dev
```

On first run, this automatically creates the SQLite database and seeds it with a default project and agents.

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000

That's it. Open http://localhost:3000 and start chatting with your AI team.

## Project Structure

```
shipcrew/
├── frontend/              # Next.js 15 app
│   └── src/
│       ├── app/           # App Router pages
│       ├── components/    # React components (chat, sidebar, tasks, files)
│       ├── hooks/         # Custom hooks (useSocket, etc.)
│       ├── lib/           # API client, utilities
│       └── store/         # Zustand state management
├── backend/               # Express.js server
│   ├── prisma/            # Database schema
│   └── src/
│       ├── api/           # REST endpoints
│       ├── agents/        # Agent configs and prompts
│       ├── orchestration/ # Pipeline, routing, execution
│       ├── mcp/           # Model Context Protocol servers
│       ├── scheduler/     # Cron-based scheduled tasks
│       ├── webhooks/      # External integrations
│       └── server.ts      # Entry point
├── shared/                # Shared TypeScript types and constants
├── docker-compose.yml     # PostgreSQL + Redis
├── .env.example           # Environment template
└── package.json           # Workspace root
```

## How It Works

```
User message → Socket.io → Pipeline → Router → Agent Executor → Claude API → Response
```

1. You type a message in a channel
2. The **Router** figures out which agents should respond (based on @mentions, channel membership, or autonomy rules)
3. The **Executor** calls Claude with the agent's system prompt, skills, and conversation history
4. Agents can use **MCP tools** (file operations, task management, code review, memory)
5. Responses stream back in real-time via Socket.io

Agents can also talk to each other, create tasks, and schedule recurring work.

## Available Scripts

```bash
# Development
npm run dev              # Start frontend + backend with hot reload
npm run build            # Build all workspaces

# Database
npm run db:push          # Push Prisma schema to PostgreSQL
npm run db:seed          # Seed database with defaults
npm run db:studio        # Open Prisma Studio (visual DB browser)

# Production
npm start                # Start backend server
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | Your Anthropic API key |
| `DATABASE_URL` | No | `file:./dev.db` | Database connection (SQLite default, PostgreSQL supported) |
| `PORT` | No | `8000` | Backend server port |
| `SANDBOX_BASE_PATH` | No | `/tmp/devteam-sandboxes` | Docker sandbox volume path |
| `SANDBOX_IMAGE` | No | `node:20-alpine` | Docker image for sandboxes |
| `WEBHOOK_SECRET` | No | — | Bearer token for webhooks |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | No | — | Email notifications |
| `SLACK_WEBHOOK_URL` | No | — | Slack notifications |

## Contributing

### Setup for contributors

```bash
# 1. Fork and clone
git clone https://github.com/your-username/shipcrew.git
cd shipcrew

# 2. Install dependencies
npm install

# 3. Start databases
docker compose up -d

# 4. Configure environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# 5. Set up database
npm run db:push
npm run db:seed

# 6. Run in dev mode
npm run dev
```

### Making changes

The monorepo has three workspaces. Here's where to make changes:

**Frontend (`frontend/`)** — UI components, pages, state management
```bash
npm run dev -w frontend    # Run just the frontend
```

**Backend (`backend/`)** — API routes, orchestration, agent logic
```bash
npm run dev -w backend     # Run just the backend
```

**Shared (`shared/`)** — Types and constants used by both
```bash
npm run build -w shared    # Rebuild after changes (both workspaces import this)
```

### Database changes

The database schema lives in `backend/prisma/schema.prisma`.

```bash
# After modifying the schema:
npm run db:push            # Apply changes to your local database
npm run db:studio          # Visually inspect your data
```

### Key areas to know

| Area | Path | What it does |
|------|------|-------------|
| Agent orchestration | `backend/src/orchestration/` | Pipeline, routing, execution |
| Agent prompts | `backend/src/agents/` | System prompts and config |
| API endpoints | `backend/src/api/` | REST routes for projects, channels, tasks, agents, files |
| MCP tools | `backend/src/mcp/` | Tools agents can use (files, tasks, memory) |
| Chat UI | `frontend/src/components/` | Chat view, sidebar, task panel |
| State management | `frontend/src/store/` | Zustand stores |
| Shared types | `shared/src/types.ts` | All TypeScript interfaces |
| Agent definitions | `shared/src/constants.ts` | Default agents, skills, channels |

### Code style

- TypeScript everywhere, strict mode
- ESM modules (`"type": "module"`)
- Functional components in React
- Tailwind for styling
- Prisma for database access
- Zod for validation (backend)

### Submitting a PR

1. Create a branch from `main`
2. Make your changes
3. Test locally (`npm run dev`, interact with the UI)
4. Push and open a PR against `main`

## API Reference

The backend exposes REST endpoints at `http://localhost:8000`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET/POST` | `/api/projects` | List / create projects |
| `GET/PATCH/DELETE` | `/api/projects/:id` | Get / update / delete project |
| `GET/POST` | `/api/projects/:id/channels` | List / create channels |
| `GET` | `/api/projects/:id/agents` | List agents |
| `POST/PATCH` | `/api/projects/:id/agents` | Create / update agents |
| `GET/POST` | `/api/projects/:id/tasks` | List / create tasks |
| `PATCH` | `/api/tasks/:id` | Update task |
| `GET/POST` | `/api/projects/:id/scheduled-tasks` | Scheduled tasks |
| `GET/POST` | `/api/projects/:id/files` | File operations |
| `POST` | `/api/webhooks/:projectId` | Incoming webhooks |

Real-time events are handled via Socket.io (connect to port 8000).

## Troubleshooting

**Database connection refused**
```bash
docker compose up -d     # Make sure PostgreSQL is running
docker compose ps        # Check container status
```

**Prisma schema out of sync**
```bash
npm run db:push          # Re-sync schema
```

**Port already in use**
```bash
lsof -i :3000            # Find what's using the port
lsof -i :8000
```

**Agents not responding**
- Check your `ANTHROPIC_API_KEY` in `.env`
- Check backend logs in the terminal running `npm run dev`
- Verify the agent has the correct channel assignment

## Advanced: PostgreSQL

For production deployments or if you prefer PostgreSQL over SQLite:

1. Start PostgreSQL with Docker:
```bash
docker compose up -d
```

2. Update your `.env`:
```
DATABASE_URL=postgresql://devteam:devteam_secret@localhost:5432/devteam
```

3. Update `backend/prisma/schema.prisma` — change the provider:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

4. Push schema and seed:
```bash
npm run db:push
npm run db:seed
```

## License

MIT
