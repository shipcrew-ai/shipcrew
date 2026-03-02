# DevTeam AI — Product Requirements Document

**Version:** 1.0
**Date:** February 28, 2026

---

## 1. Overview

DevTeam AI is a multi-agent software development platform that gives users a virtual dev team through a Slack-like collaborative interface. Instead of a single AI assistant, users interact with specialized AI agents — a PM, Developers, and a Code Reviewer — who collaborate in real time using Claude Agent SDK's Agent Teams, manage tasks on a kanban board, write real code in sandboxed container environments, and **continue working autonomously** when the user is away.

The product uses Anthropic's Claude Agent SDK with Agent Teams, MCP tool servers, persistent memory, resilient session management, a built-in task scheduler, and a webhook API in a real-time chat UI where agents behave like coworkers: they discuss in channels, pick up tasks, ask each other questions mid-execution, review code, run scheduled jobs overnight, respond to external events, and keep the user informed — all visible and transparent, whether you're watching or not.

---

## 2. Problem Statement

Current AI coding tools (Claude Code, Cursor, GitHub Copilot) are powerful but operate as a single assistant doing everything. This creates fundamental problems:

1. **Context overload** — One model tries to hold product specs, architecture decisions, frontend code, backend logic, and test coverage in a single context window. Quality degrades as complexity grows.

2. **No built-in quality gates** — There's no code review, no pushback, no second opinion. The user is the only QA layer.

3. **Black box execution** — Users see input and output but not the reasoning, tradeoffs, or decisions in between. Trust is hard to build.

4. **Fragile agent sessions** — Agents lose context when streams break mid-execution, forcing them to start fresh and repeat work. Session state is typically only saved after a successful completion, so any interruption — rate limits, network errors, SDK timeouts — destroys accumulated context.

5. **No real collaboration** — Multi-agent systems that do exist typically run agents in a sequential queue rather than simultaneously. Agents can't ask each other questions or coordinate mid-task. A developer can't ask the PM for clarification while coding.

6. **Unsafe execution** — Agents with Bash access often run directly on the host filesystem with no isolation. A hallucinated destructive command or a prompt injection from a malicious input can damage the entire system.

7. **No autonomy** — Every existing AI coding tool is purely interactive: it works only when the user is sitting in front of it. Close the tab and nothing happens. There's no way to say "run the test suite every night and message me if something breaks" or have external events (CI failure, monitoring alert) trigger agent work automatically. The AI is a tool you use, not a team that works for you.

DevTeam AI solves this by decomposing software development into specialized roles with visible collaboration, resilient sessions, real-time inter-agent coordination, sandboxed execution, and **autonomous operation** — just like a real team that keeps working when you leave the office.

---

## 3. Target Users

### Primary: Solo developers who want a "team"
- Freelancers, indie hackers, early-stage startup founders
- Technically capable but bandwidth-constrained
- Want to describe a feature and watch it get built with proper process (spec → build → review)
- Want agents to keep working overnight — running tests, monitoring for regressions, reviewing PRs

### Secondary: Non-technical founders
- Have an app idea but no engineering team
- Need a guided experience: describe what you want in plain English, review output
- Visual progress tracking through kanban board and agent status indicators
- Want to wake up to a progress summary without having to sit through every step

---

## 4. Core Concept

### The Team

Five agents form the development team. Each has a distinct personality, system prompt, tool access, and channel presence. Agents coordinate via Claude Agent SDK's Agent Teams — they message each other, share context, and collaborate mid-execution. Agents work both interactively (responding to user messages) and autonomously (running scheduled tasks, responding to webhooks).

| Agent | Name | Role | SDK Tools | MCP Tools | Channels |
|-------|------|------|-----------|-----------|----------|
| PM | Priya | Breaks requests into specs and tasks, manages scope, coordinates team | Read, Glob, Grep | `create_task`, `update_task`, `list_tasks`, `schedule_task`, `list_scheduled_tasks`, `send_message`, `list_channels`, `memory_save`, `memory_search` | #general, #tasks |
| Frontend Dev | Luna | Builds React/Next.js components, handles CSS/Tailwind, state management | Read, Write, Edit, Bash, Glob, Grep | `update_task`, `list_tasks`, `send_message`, `list_channels`, `memory_save`, `memory_search` | #general, #frontend |
| Backend Dev | Marcus | Builds Express APIs, Prisma schemas, database logic, authentication | Read, Write, Edit, Bash, Glob, Grep | `update_task`, `list_tasks`, `send_message`, `list_channels`, `memory_save`, `memory_search` | #general, #backend |
| Fullstack Dev | Jasper | Handles cross-cutting concerns, integrations, project scaffolding, tooling | Read, Write, Edit, Bash, Glob, Grep | `update_task`, `list_tasks`, `send_message`, `list_channels`, `memory_save`, `memory_search` | #general |
| Code Reviewer | Suki | Reviews code quality, checks for bugs and security issues, approves or rejects tasks | Read, Glob, Grep | `approve_task`, `reject_task`, `list_tasks`, `send_message`, `list_channels`, `memory_save`, `memory_search` | #code-review |

Each agent's system prompt includes the full team roster — every agent knows every other agent's name, role, specialization, and which channel they operate in. This enables natural delegation and coordination.

### Agent Teams Coordination

The PM spawns Developers and the Reviewer as **Agent Teams teammates**. They run simultaneously, share context, and message each other directly:

```
User: "Build me a REST API for user management"

PM (Priya) starts as team coordinator
  ├── Spawns Marcus (Backend Dev) as teammate
  ├── Spawns Suki (Reviewer) as teammate
  │
  ├── Priya creates tasks on the kanban board, assigns to Marcus
  ├── Marcus starts coding, messages Priya: "Should users have email or username login?"
  ├── Priya responds: "Email-based, with password reset flow"
  ├── Marcus finishes endpoint, messages Suki: "Ready for review"
  ├── Suki reviews the code, messages Marcus: "Missing input validation on POST /users"
  ├── Marcus fixes the validation
  ├── Suki approves the task
  └── Priya summarizes what was built and posts to #general
```

All messages between agents are visible in the channel UI — users watch the team collaborate in real time. This is not simulated collaboration; agents are running concurrently and communicating through the SDK's native messaging primitives.

For simpler requests (single-agent tasks, quick questions), the system routes directly to the appropriate agent without spawning a full team. The Message Router decides based on @mentions and channel membership.

### Trigger System (Autonomous Workflows)

In addition to Agent Teams coordination, a trigger system enables autonomous cascading workflows driven by MCP tool usage:

- **PM creates a task and assigns it** → the assigned Developer is automatically triggered
- **Developer moves a task to "review"** → the Reviewer is automatically triggered in #code-review
- **Reviewer approves a task** → the PM is automatically triggered for completion tracking
- **Reviewer rejects a task** → the assigned Developer is automatically triggered with the rejection reason

Triggers fire after the triggering agent completes execution. A depth limit (`MAX_PIPELINE_DEPTH = 10`) prevents infinite recursion. Triggers create synthetic messages visible in the UI so users see exactly what initiated each agent's work.

### Autonomous Operation

DevTeam AI doesn't stop working when you close the browser. Three systems enable autonomous operation:

**Task Scheduler** — Agents can schedule recurring or one-time jobs:
- `"Run the test suite every night at 2am and post results to #general"`
- `"Every Monday morning, review open tasks and post a standup summary"`
- `"In 30 minutes, check if the build passed"`

The scheduler runs on the server as a polling loop, checking for due tasks every 60 seconds. When a task is due, it creates a synthetic message and routes it through the normal pipeline — the agent runs with full tool access, posts results to the appropriate channel, and the user sees it next time they open the UI.

**Webhook API** — External systems can trigger agent work via HTTP:
- CI/CD pipeline fails → webhook fires → PM is triggered to investigate
- Monitoring alert → webhook fires → relevant developer is triggered to diagnose
- GitHub PR opened → webhook fires → Reviewer is triggered to review

Three endpoints: `/hooks/wake` (queue a task), `/hooks/agent` (fire an agent immediately), `/hooks/alert` (inject an alert message into a channel). All authenticated with Bearer tokens and idempotency keys.

**Push Notifications** — When agents complete autonomous work, the system notifies the user through configured channels (email, Slack webhook, or browser push notifications) so they don't have to keep checking the UI.

### The Interface

A Slack-like web app where:
- **Channels** are project workstreams (#general, #code-review, #tasks, #frontend, #backend)
- **@mentions** delegate to specific agents (e.g., `@Luna fix the header styling`)
- **A kanban board** shows tasks moving through To Do → In Progress → Review → Done
- **Agent status indicators** show what each agent is currently doing in real time (idle, thinking, working, error)
- **Token streaming** shows agent responses as they're generated, character by character
- **Agent-to-agent messages** are visible in channels — users see the team discuss, not just output
- **Error banners** appear when an agent encounters a problem, with context and a retry button
- **Scheduled task panel** shows upcoming and past scheduled jobs with status and output
- **Activity feed** shows what happened while you were away — agents that ran, tasks completed, errors encountered

### The Execution Layer

Each project gets an **isolated Docker container sandbox** where Developer agents can read/write files and execute commands. Code is real and runnable. The container sees only `/workspace/` (project files) and `/tmp/` (scratch space) — no access to the host filesystem, SSH keys, environment variables, or other projects. A hallucinated `rm -rf /` destroys the container's filesystem, not the host.

---

## 5. User Flow

### 5.1 New Project

1. User opens DevTeam AI and creates a new project (name + description)
2. The system provisions:
   - Five agents (Priya, Luna, Marcus, Jasper, Suki) with stored session state
   - Five channels (#general, #code-review, #tasks, #frontend, #backend)
   - A Docker container sandbox for code execution
   - An empty kanban board
3. User describes what they want in #general (e.g., "Build me a SaaS landing page with waitlist signup")
4. The message is routed to PM (Priya) via the Message Router
5. Priya breaks the request into tasks and creates them on the kanban board
6. Priya spawns the relevant Developer agents as Agent Teams teammates — they begin work immediately
7. Developers write code in the sandbox container, updating task statuses as work progresses
8. When a Developer finishes a task, the Reviewer (Suki) is automatically triggered
9. Suki reviews the code, either approving (task → Done) or rejecting with feedback (task → back to Developer)
10. All agent-to-agent communication is visible in channels throughout

### 5.2 Ongoing Interaction

- User can @mention any agent at any time to ask questions, give feedback, or redirect work
- User can switch channels to see topic-specific conversations (#frontend for Luna's work, #backend for Marcus's)
- Agent status indicators in the sidebar show who's working and what they're doing
- Streaming responses let users watch agents think in real time
- The kanban board updates live as agents create, assign, and move tasks
- Agents ask each other questions mid-execution — all visible in the appropriate channel
- If an agent encounters an error, an error banner appears with context and a retry button
- Agents remember user preferences across sessions via persistent memory

### 5.3 Autonomous Operation

- User says: `"@Priya run the test suite every night at 2am and message me the results"`
- Priya uses `schedule_task` to create a cron-based scheduled task assigned to Marcus
- Every night at 2am, the scheduler fires, Marcus runs `npm test` in the sandbox
- Results are posted to #backend — if tests fail, Marcus posts which tests broke and a suggested fix
- User gets a push notification: "Marcus: 3 tests failed in user-auth module"
- User opens the app the next morning and sees the full output in #backend, with a retry button

### 5.4 Webhook-Driven Work

- User configures a GitHub webhook to POST to `/hooks/alert` when a PR is opened
- A PR is opened at 3pm while the user is in a meeting
- The webhook creates an alert message in #code-review
- Suki is triggered, reads the PR diff, posts a review summary with approve/reject recommendation
- User opens DevTeam AI after the meeting and sees Suki's review waiting

### 5.5 Example Session

```
User in #general:
  "Build a todo app with React frontend and Express API. Use PostgreSQL.
   Also, set up nightly test runs."

#tasks channel:
  [Priya] Created task: "Set up Express server with PostgreSQL connection" → assigned to Marcus
  [Priya] Created task: "Create todo CRUD API endpoints" → assigned to Marcus
  [Priya] Created task: "Build React todo list component" → assigned to Luna
  [Priya] Created task: "Build add/edit todo form" → assigned to Luna
  [Priya] Created task: "Connect frontend to API" → assigned to Jasper
  [Priya] Scheduled: "Run test suite" — every day at 2:00 AM → assigned to Marcus

#backend channel:
  [System] Marcus was automatically triggered by task assignment
  [Marcus] Setting up Express with Prisma... (status: working)
  [Marcus → Priya] Should I include authentication or keep it simple for now?
  [Priya → Marcus] Keep it simple — no auth for the first pass.
  [Marcus] Created server.ts, prisma schema, and todo routes.
  [Marcus] Moved "Set up Express server" to Review.

#code-review channel:
  [System] Suki was automatically triggered by review request
  [Suki] Reviewing Marcus's Express setup...
  [Suki → Marcus] Missing error handling on the database connection. What happens if PostgreSQL is down?
  [Marcus] Good catch — adding connection retry with exponential backoff.
  [Suki] Approved. Moving to Done.

#frontend channel:
  [Luna] Building TodoList component with Tailwind styling...
  [Luna] Moved "Build React todo list component" to Review.

  ... (continues)

--- Next day, 2:00 AM (user is asleep) ---

#backend channel:
  [System] Scheduled task triggered: "Run test suite"
  [Marcus] Running npm test...
  [Marcus] ✅ All 12 tests passed.
  [Marcus] Test run complete. No issues found.

→ Push notification sent to user: "Marcus: All 12 tests passed"
```

---

## 6. Architecture

### System Layers

```
┌──────────────────────────────────────────────────────────────┐
│                 Slack-like Web UI (Next.js)                   │
│   Channels · Chat · Kanban · Agent Status · Scheduled Tasks   │
└───────────────────────────┬──────────────────────────────────┘
                            │ Socket.io (bidirectional)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                  Orchestration Server                         │
│                  (Node.js + Express, port 8000)               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │   Pipeline    │  │   Message    │  │   Turn Manager     │ │
│  │              │  │   Router     │  │   (per-channel      │ │
│  │  Entry point │  │              │  │    sequential queue, │ │
│  │  for all     │──▶  @mentions  │──▶   cross-channel     │ │
│  │  messages    │  │  + channel   │  │    parallel)        │ │
│  │              │  │  membership  │  │                     │ │
│  └──────────────┘  └──────────────┘  └─────────┬──────────┘ │
│                                                 │            │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────▼──────────┐ │
│  │   Context    │  │   Session    │  │   Agent Executor    │ │
│  │   Builder    │  │   Manager    │  │                     │ │
│  │              │  │              │  │  • query() wrapper   │ │
│  │  Project info│  │  Eager       │  │  • Immediate session │ │
│  │  + tasks     │  │  persist on  │  │    persistence      │ │
│  │  + messages  │──▶  init, stale │──▶  • AbortController  │ │
│  │  + memory    │  │  detection,  │  │    timeout (120s)   │ │
│  │              │  │  auto-clear  │  │  • Error propagation │ │
│  └──────────────┘  └──────────────┘  │  • Agent Teams      │ │
│                                      │  • Streaming to UI   │ │
│  ┌──────────────┐  ┌──────────────┐  │  • Code diff emit   │ │
│  │   Trigger    │  │   Error      │  └─────────┬──────────┘ │
│  │   System     │  │   Handler    │            │            │
│  │              │  │              │            │            │
│  │  Autonomous  │  │  Executor →  │            │            │
│  │  cascading   │  │  Turn Mgr → │            │            │
│  │  workflows   │  │  Pipeline → │            │            │
│  │  Depth limit │  │  Frontend   │            │            │
│  └──────────────┘  └──────────────┘            │            │
│                                                │            │
│  ┌──────────────┐  ┌──────────────┐            │            │
│  │   Task       │  │   Webhook    │            │            │
│  │   Scheduler  │  │   API        │            │            │
│  │              │  │              │            │            │
│  │  Polls every │  │  /hooks/wake │            │            │
│  │  60s for due │  │  /hooks/agent│────────────┘            │
│  │  tasks, fires│  │  /hooks/alert│                         │
│  │  into        │  │              │                         │
│  │  pipeline    │  │  Bearer auth │                         │
│  │              │  │  Idempotency │                         │
│  └──────┬───────┘  └──────────────┘                         │
│         │                                                    │
│  ┌──────▼───────┐  ┌──────────────┐                         │
│  │  Notification │  │   Process    │                         │
│  │  Service      │  │   Manager    │                         │
│  │              │  │              │                         │
│  │  Email       │  │  Crash       │                         │
│  │  Slack hook  │  │  recovery    │                         │
│  │  Browser push│  │  In-flight   │                         │
│  │              │  │  task replay │                         │
│  └──────────────┘  └──────────────┘                         │
└────────────────────────────────────────────────┬────────────┘
                                                 │
                     ┌───────────────────────────┼──────────────┐
                     │                           │              │
                     ▼                           ▼              ▼
              ┌────────────┐  ┌────────────┐  ┌────────────┐
              │ PM (Priya) │←→│ Devs       │←→│ Reviewer   │
              │            │  │ Luna       │  │ (Suki)     │
              │ Coordinator│  │ Marcus     │  │            │
              │            │  │ Jasper     │  │            │
              └────────────┘  └────────────┘  └────────────┘
                Claude Agent SDK — Agent Teams
                • Teammates share context
                • Direct messaging mid-execution
                • Shared task list via MCP tools
                • Concurrent execution
                              │
                ┌─────────────┼─────────────┐
                ▼                           ▼
     ┌─────────────────────┐    ┌─────────────────────┐
     │  Container Sandbox   │    │     PostgreSQL       │
     │  (Docker, per-project│    │     (Prisma ORM)     │
     │                      │    │                      │
     │  /workspace/ (r/w)   │    │  projects            │
     │  /tmp/ (scratch)     │    │  agents              │
     │                      │    │  channels            │
     │  No host FS access   │    │  messages            │
     │  No ~/.ssh, .env     │    │  tasks               │
     │  Network: restricted │    │  agent_memory        │
     └─────────────────────┘    │  scheduled_tasks     │
                                │  scheduled_task_runs │
                                │  webhook_logs        │
                                └─────────────────────┘
```

### Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | Next.js 14 + Tailwind CSS + Zustand | Dark theme, real-time state management via Zustand store slices |
| Real-time | Socket.io | Bidirectional events for messages, streams, tasks, agent status, errors, collaboration, scheduled task results |
| Backend | Node.js + Express | REST API + WebSocket server + Webhook API on port 8000 |
| AI | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) | `query()` with Agent Teams, streaming via async iterators, MCP tool servers, session resume, `maxBudgetUsd` |
| Database | PostgreSQL 16 (via Docker) | Prisma ORM, 9 tables with cascade deletes, FTS indexing on agent_memory |
| Sandbox | Docker containers | Per-project isolated filesystem, network, and process space |
| Scheduling | Built-in cron + interval scheduler | `node-cron` for cron parsing, 60-second polling loop, exponential backoff on failure |
| Notifications | Email (Nodemailer) + Slack webhook + Web Push | Configurable per-project notification channels |
| Infrastructure | Docker Compose | PostgreSQL + Redis + sandbox container management |
| Monorepo | npm workspaces | 3 packages: `shared/` (types + constants), `backend/` (server), `frontend/` (UI) |

### Key Orchestration Components

#### Pipeline
Entry point for all messages — both user-initiated and system-generated (scheduled tasks, webhooks). Receives a message, passes it through the Message Router to determine which agents should respond, then enqueues them in the Turn Manager for execution. The pipeline is non-blocking — the caller returns immediately after saving the message and broadcasting it.

#### Message Router
Determines which agents respond to a given message. Routing logic:
1. **@mentions take priority** — if the user writes `@Luna fix the header`, Luna is routed first regardless of channel rules
2. **Channel membership rules** — if no @mention, routes by channel:
   - `#general` → PM (Priya)
   - `#code-review` → Reviewer (Suki)
   - `#tasks` → PM (Priya)
   - `#frontend` → Frontend Dev (Luna)
   - `#backend` → Backend Dev (Marcus)
3. **DM channels** — route based on the agent name in the channel (e.g., `dm-priya` → Priya)
4. **Scheduled tasks** — routed to the assigned agent in the task's target channel
5. **Webhook alerts** — routed based on the webhook configuration (target agent + channel)

The router returns a list of `RoutedAgent` objects, each with an `agentId`, `role`, `reason` (mentioned | channel_member | autonomous | scheduled | webhook), and optional `channelId` override.

#### Turn Manager
Manages execution order. Per-channel queues enforce sequential execution within a channel (prevents two agents from writing to the same channel simultaneously). Across channels, agents run in parallel. Mentioned agents are prioritized over channel-member agents within the same queue. Scheduled tasks and webhook-triggered work enter the same queue.

When the executor throws an error, the Turn Manager **propagates it** — it does not silently continue to the next agent. The error flows up to the pipeline, which emits a structured error event to the frontend.

#### Context Builder
Assembles the prompt for each agent invocation. The context includes:
- **Project info** — name, description
- **Channel name** — so the agent knows where it's posting
- **Last 20 tasks** — with status, assignee name, creator name
- **Last 20 messages** — with sender name (user or agent), timestamps
- **Relevant memories** — FTS search results from `agent_memory` based on the current message
- **Scheduled task context** — if this is a scheduled execution, includes the task description and schedule metadata
- **The current message** — user message, scheduled task prompt, or webhook payload

This ensures each agent has enough context to make informed decisions without overloading the context window with the entire project history.

#### Agent Executor
Wraps the Claude Agent SDK `query()` call with resilience and observability:

**Session Management:**
- On invocation, checks if the agent has a stored `sessionId` in the database
- If yes, passes `resume: sessionId` to `query()` for conversation continuity
- If resume fails (stale or corrupted session), clears the session and retries fresh
- `sessionId` is persisted to the database **immediately** when the SDK emits the `init` message — not after stream completion. This ensures sessions survive mid-stream failures.
- `sessionId` is also persisted again on the `result` message as a secondary checkpoint

**Timeout Protection:**
- Every agent execution is wrapped with an `AbortController` and a configurable timeout (default 120 seconds)
- If the timeout fires, the abort signal breaks the `for await` loop
- The agent's status is set to "error", an `agent.error` event is emitted to the frontend, and the preserved session allows the next invocation to resume where it left off

**Streaming:**
- The executor iterates over the async iterator returned by `query()`
- `assistant` messages with text blocks are streamed to the frontend token-by-token via `emitStreamToken()`
- `tool_use` blocks trigger agent status updates (e.g., "Marcus is using Write...")
- `Write` and `Edit` tool uses emit `code.diff` events to the frontend for real-time file change visibility

**Error Handling:**
- Errors are caught, logged, and propagated — not swallowed
- The agent's status is updated to "error" in the database
- An `agent.error` Socket.io event is emitted with the error message and a `retryable` flag
- A fallback error message is saved to the database so the user sees feedback in the chat
- The `finally` block always runs: clears execution context, sets agent to "idle"

**Post-Execution Triggers:**
- After the executor finishes, it drains any pending triggers queued by MCP tools during execution
- Each trigger creates a synthetic message and enqueues the target agent
- Triggers are depth-tracked to prevent infinite recursion

#### Session Manager
Ensures session continuity across the agent lifecycle:
- **Eager persistence** — sessions are saved on `init`, not on completion
- **Stale detection** — if `resume` throws, the session is cleared and execution retries fresh
- **Crash recovery** — because sessions are persisted before work begins, a crash mid-stream does not lose the session. The next invocation picks up where it left off.

#### Trigger System
Enables autonomous agent-to-agent workflows without user intervention:

| When this happens... | ...this agent is triggered |
|---|---|
| PM creates a task and assigns it to a developer | The assigned developer, in their home channel |
| Developer moves a task to "review" status | Reviewer (Suki) in #code-review |
| Reviewer approves a task | PM (Priya) in #tasks |
| Reviewer rejects a task | The assigned developer, with the rejection reason |

Triggers fire **after** the triggering agent completes — never mid-execution, to prevent concurrent `query()` conflicts. Each trigger creates a visible synthetic message in the target channel (marked with `{ autonomous: true, depth: N, source: "role:tool_name" }` metadata) so users see exactly what initiated the work.

A depth limit of `MAX_PIPELINE_DEPTH = 10` prevents infinite cascading. If the limit is reached, the trigger is logged and skipped.

#### Task Scheduler
A server-side polling loop that enables agents to work without user interaction:

**Scheduling:**
- Agents create scheduled tasks via the `schedule_task` MCP tool
- Three schedule types:
  - **Cron** — recurring on a cron expression (e.g., `0 2 * * *` for 2am daily)
  - **Interval** — recurring on a fixed interval (e.g., every 30 minutes)
  - **Once** — one-time execution at a specific ISO timestamp
- Each scheduled task specifies: assigned agent, target channel, prompt (what to do), and schedule

**Execution:**
- The scheduler loop polls the `scheduled_tasks` table every 60 seconds
- When a task is due (`next_run <= now` and `status = 'active'`), it:
  1. Creates a synthetic message in the target channel (visible in UI, marked as `{ scheduled: true }`)
  2. Routes to the assigned agent through the normal pipeline
  3. The agent runs with full tool access in the sandbox container
  4. Results are posted to the channel
  5. Cron and interval tasks compute and store the next `next_run`; one-shot tasks are marked `completed`
- Each run is logged in `scheduled_task_runs` with duration, status (success/failure), and output summary

**Failure handling:**
- If a scheduled task fails, it retries with exponential backoff (5s, 15s, 45s) up to 3 attempts
- After 3 consecutive failures, the task is paused (status = `paused`) and an alert is posted to the channel
- The user can resume paused tasks from the UI or via `@Priya resume the nightly test task`

**Management:**
- Users can ask the PM to list, pause, resume, or cancel scheduled tasks via natural language
- The Scheduled Tasks panel in the UI shows all tasks with their schedule, last run status, and next run time

#### Webhook API
Three HTTP endpoints that allow external systems to trigger agent work:

**`POST /hooks/wake`** — Queue a task for later processing
- Body: `{ projectId, channelId, agentRole, message }`
- Creates a message in the specified channel and routes it through the pipeline
- Returns `202 Accepted` with a task ID for tracking

**`POST /hooks/agent`** — Fire an agent immediately
- Body: `{ projectId, channelId, agentRole, message }`
- Creates a one-shot scheduled task and fires it immediately
- Returns `202 Accepted` with a task ID

**`POST /hooks/alert`** — Inject a formatted alert into a channel
- Body: `{ projectId, channelId, title, body, severity }`
- Creates a styled alert message in the channel
- Routes to the channel's default agent for response
- Returns `202 Accepted`

All webhook endpoints require:
- `Authorization: Bearer <token>` header (timing-safe comparison)
- Optional `Idempotency-Key` header to prevent duplicate processing
- All requests are logged in the `webhook_logs` table for audit

#### Notification Service
Delivers push notifications when agents complete autonomous work (scheduled tasks, webhook-triggered jobs):

- **Email** — via Nodemailer (SMTP or SendGrid). Sends a summary with the agent's output and a link to the channel.
- **Slack webhook** — posts a formatted message to a configured Slack channel with the agent's result and a link back to DevTeam AI.
- **Browser push notifications** — via Web Push API. Short notification with agent name and result summary.

Notification preferences are configured per-project. Users can choose which events trigger notifications:
- All scheduled task completions
- Only failures
- Only when specific agents run
- Webhook-triggered work only

#### Process Manager
Ensures the system runs reliably as a long-lived service:

- **Crash recovery** — on startup, the process manager checks for in-flight scheduled tasks (status = `running` from a previous crash) and re-queues them
- **Graceful shutdown** — on SIGTERM/SIGINT, drains the turn manager queues, waits for active agent executions to complete (up to 30 seconds), then exits cleanly
- **Health check endpoint** — `GET /health` returns system status including scheduler state, active agents, and database connectivity
- **Process supervision** — designed to run under systemd (Linux) or launchd (macOS) for automatic restart on crash

#### Execution Context
Per-agent context storage that supports concurrent agent execution:
- Keyed by `agentId` — multiple agents on different channels can run simultaneously without state conflicts
- Stores `projectId`, `agentId`, `agentRole`, `channelId`, `depth`, and `executionSource` (user | scheduled | webhook)
- MCP tool handlers read from this context to know which project and agent they're operating on
- Pending triggers are collected here during execution and drained after completion

---

## 7. Data Model

### Tables (Prisma Schema)

#### projects
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | String | Project name |
| description | String? | Project description |
| sandboxPath | String | Path to the Docker container's workspace volume |
| notificationConfig | JSON? | Push notification preferences (email, Slack webhook URL, browser push) |
| webhookToken | String? | Bearer token for authenticating webhook requests to this project |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

#### agents
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID (FK → projects) | Parent project |
| role | String | One of: pm, frontend-dev, backend-dev, fullstack-dev, reviewer |
| name | String | Display name (Priya, Luna, Marcus, Jasper, Suki) |
| title | String | Job title (Project Manager, Frontend Developer, etc.) |
| avatar | String | Emoji avatar |
| color | String | Hex color for UI styling |
| status | String | One of: idle, thinking, working, error |
| statusMessage | String? | Human-readable status (e.g., "Marcus is using Write...") |
| sessionId | String? | Claude Agent SDK session ID for conversation resume |
| createdAt | DateTime | Creation timestamp |

Unique constraint on `(projectId, role)`. Cascade deletes from project.

#### channels
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID (FK → projects) | Parent project |
| name | String | Channel name (general, code-review, tasks, frontend, backend) |
| description | String? | Channel purpose |
| createdAt | DateTime | Creation timestamp |

Unique constraint on `(projectId, name)`. Cascade deletes from project.

#### messages
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| channelId | UUID (FK → channels) | Parent channel |
| role | String | "user" or "assistant" |
| agentId | UUID? (FK → agents) | Which agent sent this (null for user messages) |
| content | String | Message text (markdown) |
| metadata | JSON? | Contextual metadata: `{ autonomous, scheduled, webhook, depth, source, crossPost }` |
| createdAt | DateTime | Creation timestamp |

Indexed on `(channelId, createdAt)` for efficient message history queries. Cascade deletes from channel → project.

#### tasks
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID (FK → projects) | Parent project |
| title | String | Task title |
| description | String? | Task description |
| status | String | One of: todo, in_progress, review, done |
| assigneeAgentId | UUID? (FK → agents) | Agent assigned to work on this |
| createdByAgentId | UUID? (FK → agents) | Agent that created this task |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

Cascade deletes from project.

#### agent_memory
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID (FK → projects) | Parent project |
| agentId | UUID (FK → agents) | Agent that saved this memory |
| key | String | Short label (e.g., "user-preference-css", "api-design-decision") |
| content | String | Full content of the memory note |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

FTS index on `(key, content)` for keyword search. Memories survive session resets, crashes, restarts, and context compaction. Any agent can search all memories within a project. Cascade deletes from project.

#### scheduled_tasks
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID (FK → projects) | Parent project |
| assigneeAgentId | UUID (FK → agents) | Agent that executes this task |
| createdByAgentId | UUID (FK → agents) | Agent that created this task |
| channelId | UUID (FK → channels) | Channel where results are posted |
| title | String | Human-readable name (e.g., "Nightly test run") |
| prompt | String | The message sent to the agent when the task fires |
| scheduleType | String | One of: cron, interval, once |
| scheduleValue | String | Cron expression, interval in ms, or ISO timestamp |
| nextRun | DateTime? | When this task will next fire |
| status | String | One of: active, paused, completed, running |
| consecutiveFailures | Int | Counter for backoff/auto-pause (resets on success) |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

Indexed on `(status, nextRun)` for efficient scheduler polling. Cascade deletes from project.

#### scheduled_task_runs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| scheduledTaskId | UUID (FK → scheduled_tasks) | Parent task |
| status | String | One of: success, failure |
| durationMs | Int | How long the agent ran |
| output | String? | Summary of the agent's result |
| error | String? | Error message if the run failed |
| createdAt | DateTime | When this run started |

Cascade deletes from scheduled_task → project.

#### webhook_logs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID (FK → projects) | Parent project |
| endpoint | String | Which endpoint was hit (wake, agent, alert) |
| method | String | HTTP method |
| headers | JSON | Sanitized request headers (auth token redacted) |
| body | JSON | Request body |
| idempotencyKey | String? | Client-provided idempotency key |
| status | String | One of: accepted, rejected, duplicate |
| responseCode | Int | HTTP status code returned |
| createdAt | DateTime | When the webhook was received |

Indexed on `(projectId, createdAt)` and unique partial index on `(idempotencyKey)` where not null. Cascade deletes from project.

---

## 8. Real-time Event Types

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `message.send` | `{ channelId, content, projectId }` | User sends a message. Saved to DB, broadcast to channel, triggers agent pipeline. |
| `channel.join` | `{ channelId }` | Client joins a Socket.io room to receive channel events. |
| `channel.leave` | `{ channelId }` | Client leaves a Socket.io room. |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `message.new` | `{ id, channelId, role, agentId, content, metadata, createdAt }` | A complete message from a user, agent, scheduled task, or webhook. Emitted after the message is saved to the database. |
| `message.stream` | `{ messageId, agentId, channelId, token }` | A streaming token chunk from an agent. Frontend appends the token to the in-progress message. |
| `message.stream.end` | `{ messageId, agentId, channelId }` | Agent finished streaming. Frontend finalizes the message and stops the typing animation. |
| `task.updated` | `{ id, projectId, title, description, status, assigneeAgentId, createdByAgentId, ... }` | A task was created, its status changed, or it was reassigned. Frontend updates the kanban board. |
| `agent.status` | `{ agentId, status, statusMessage }` | Agent status changed. `status` is one of: idle, thinking, working, error. Frontend updates the sidebar status dot and the agent status bar. |
| `agent.error` | `{ agentId, error, retryable }` | Agent encountered an error. Displayed via the ErrorBanner component. |
| `code.diff` | `{ projectId, file, action, content }` | A Developer agent wrote or edited a file. |
| `agent.collaboration` | `{ fromAgentId, toAgentId, channelId, content }` | An agent-to-agent message via Agent Teams. Rendered in the channel UI with distinct styling. |
| `scheduled.updated` | `{ id, projectId, title, status, nextRun, lastRunStatus }` | A scheduled task was created, paused, resumed, or completed a run. Frontend updates the Scheduled Tasks panel. |
| `scheduled.run` | `{ scheduledTaskId, status, output, durationMs }` | A scheduled task run completed. Shows result in the Activity Feed. |
| `webhook.received` | `{ projectId, endpoint, status }` | A webhook was received and processed. Shows in the Activity Feed. |

---

## 9. REST API

### Projects & Core Resources

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check. Returns `{ status, scheduler, activeAgents, db }`. |
| GET | `/api/projects` | List all projects. |
| GET | `/api/projects/:id` | Get a project with its agents, channels, and notification config. |
| POST | `/api/projects` | Create a new project. Auto-provisions 5 agents, 5 channels, and a Docker sandbox container. Body: `{ name, description }`. |
| DELETE | `/api/projects/:id` | Delete a project. Tears down sandbox container, cancels all scheduled tasks, cascade-deletes everything. |
| PATCH | `/api/projects/:id/notifications` | Update notification preferences. Body: `{ email?, slackWebhookUrl?, browserPush? }`. |

### Channels & Messages

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/:projectId/channels` | List channels for a project. |
| GET | `/api/channels/:channelId/messages` | List messages. Supports `limit`, `before` cursor, and `source` filter (user, agent, scheduled, webhook). |

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/:projectId/tasks` | List all tasks with assignee and creator info. |
| POST | `/api/projects/:projectId/tasks` | Create a task. Body: `{ title, description?, status?, assigneeAgentId? }`. |
| PATCH | `/api/tasks/:id` | Update a task. |
| DELETE | `/api/tasks/:id` | Delete a task. |

### Scheduled Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/:projectId/scheduled-tasks` | List all scheduled tasks with last run info and next run time. |
| POST | `/api/projects/:projectId/scheduled-tasks` | Create a scheduled task. Body: `{ title, prompt, assigneeRole, channelName, scheduleType, scheduleValue }`. |
| PATCH | `/api/scheduled-tasks/:id` | Update a scheduled task (pause, resume, change schedule). |
| DELETE | `/api/scheduled-tasks/:id` | Cancel and delete a scheduled task. |
| GET | `/api/scheduled-tasks/:id/runs` | List run history for a scheduled task. |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/hooks/wake` | Queue a task for agent processing. Requires Bearer token. |
| POST | `/hooks/agent` | Fire an agent immediately. Requires Bearer token. |
| POST | `/hooks/alert` | Inject a formatted alert into a channel. Requires Bearer token. |
| GET | `/api/projects/:projectId/webhook-logs` | List webhook audit logs. Supports `limit` and `before` cursor. |
| POST | `/api/projects/:projectId/webhook-token` | Generate or rotate the project's webhook Bearer token. |

---

## 10. MCP Tool Servers

Each agent role has a dedicated MCP tool server created at execution time via `createSdkMcpServer()`. Tool handlers receive the project context from the Execution Context and operate on the project's database records. Task mutations emit `task.updated` Socket.io events so the kanban board updates in real time.

### PM Tools (`pm-tools`)

#### `create_task`
Creates a new task on the kanban board. Accepts `title` (required), `description` (optional), and `assignee` (optional, by role name e.g. "frontend-dev"). If an assignee is specified, the tool resolves the role name to an agent ID and **queues a trigger** to automatically invoke that developer after the PM finishes.

#### `update_task`
Updates a task's title, description, status, or assignee. If the assignee changes, queues a trigger for the new assignee.

#### `list_tasks`
Returns all tasks in the project with status, assignee name, and creator name. Used by the PM to understand current work distribution before making decisions.

#### `schedule_task`
Creates a scheduled task. Accepts `title` (human-readable name), `prompt` (what the agent should do), `assigneeRole` (which agent runs it), `channelName` (where to post results), `scheduleType` (cron, interval, or once), and `scheduleValue` (cron expression, milliseconds, or ISO timestamp). Computes the initial `nextRun` and saves to the database. Emits `scheduled.updated` to the frontend.

#### `list_scheduled_tasks`
Returns all scheduled tasks in the project with their status, schedule, last run result, and next run time. Used by the PM to report on autonomous work.

### Developer Tools (`dev-tools`)

#### `update_task`
Updates a task's status. When the status changes to `"review"`, the tool **queues a trigger** for the Reviewer (Suki) in #code-review, passing the task title and description so Suki knows what to review.

#### `list_tasks`
Returns all tasks in the project. Used by developers to see their assigned work and overall progress.

### Reviewer Tools (`reviewer-tools`)

#### `approve_task`
Sets a task's status to `"done"`. Accepts an optional `comment`. **Queues a trigger** for the PM in #tasks to track completion.

#### `reject_task`
Sets a task's status back to `"in_progress"`. Requires a `reason` explaining what needs to be fixed. **Queues a trigger** for the assigned developer in their home channel, passing the rejection reason so they know exactly what to address.

#### `list_tasks`
Returns all tasks in the project. Used by the reviewer to see what's pending review.

### Common Tools (`common-tools`) — Available to All Agents

#### `send_message`
Posts a message to any channel in the project. Used for cross-team coordination (e.g., a backend developer posting in #frontend to coordinate an API contract). The message is saved to the database with `crossPost: true` metadata and emitted to the frontend.

#### `list_channels`
Returns all channels in the project with their names and descriptions.

#### `memory_save`
Saves a structured note to persistent memory. Accepts `key` (short label) and `content` (full note). If a memory with the same key exists for this agent, it is updated; otherwise a new record is created. Used to persist decisions, user preferences, architectural choices, and learned context that should survive across sessions.

#### `memory_search`
Searches persistent memory by keyword using FTS. Returns matching memories across all agents in the project, so any agent can access institutional knowledge saved by any other agent. Used by the Context Builder to inject relevant memories into each agent's prompt.

---

## 11. Frontend Components

### Layout

#### Sidebar
- **Channel List** — All project channels with active indicator (highlighted when selected). Unread message counts.
- **Team Section** — Agent avatars with live status dots:
  - Green = idle (ready)
  - Yellow/pulsing = thinking (processing)
  - Blue = working (using tools)
  - Red = error
- **Scheduled Tasks** — Quick view of upcoming scheduled runs with countdown timers
- **Project Selector** — Switch between projects (if multiple exist)

#### Header
- Channel name and description
- Agent avatars for agents that operate in this channel
- Task panel toggle button (slide-out right panel)

#### TaskPanel
- Slide-out right panel with two tabs:
  - **Kanban** — the kanban board
  - **Scheduled** — scheduled tasks list with status, schedule, last run, next run, and pause/resume/cancel controls

### Chat

#### ChannelView
- Scrollable message list with auto-scroll to bottom on new messages
- Renders `MessageBubble` for completed messages, `StreamingMessage` for in-progress responses
- Shows `TypingIndicator` when an agent is actively generating
- `MessageInput` at the bottom for user input
- **Activity markers** — visual separators showing "While you were away" with a summary of scheduled/webhook activity

#### MessageBubble
- Agent avatar (emoji with colored background) or user avatar
- Colored agent name (each agent has a distinct color) or "You" for user messages
- Timestamp
- Markdown-rendered content (code blocks, lists, bold, etc.)
- **Collaboration messages** (agent-to-agent) are styled with a distinct background and a "→" indicator showing direction (e.g., "Marcus → Suki")
- **Autonomous trigger messages** show a subtle "triggered by [source]" label
- **Scheduled task messages** show a clock icon and "Scheduled run" label
- **Webhook-triggered messages** show a webhook icon and source label

#### StreamingMessage
- In-progress response with blinking cursor at the end
- Text appears token by token as `message.stream` events arrive
- Agent avatar and name shown from the start

#### TypingIndicator
- Three bouncing dots with the agent's name (e.g., "Priya is thinking...")
- Shown when `agent.status` is "thinking" or "working"

#### MessageInput
- Textarea with Enter-to-send (Shift+Enter for newline)
- @mention autocomplete dropdown — type `@` to see agent names, select to insert
- Disabled state with loading indicator while agents are responding (optional, configurable)

#### ErrorBanner
- Displayed inline in the chat when an `agent.error` event fires
- Shows the agent's avatar, name, and error description
- Retry button (if `retryable` is true) re-sends the last user message
- Dismissable

### Tasks

#### KanbanBoard
- 4 columns: To Do, In Progress, In Review, Done
- Each column has a colored header and a task count badge
- Tasks animate between columns on status changes
- Drag-and-drop for manual task reordering (optional)

#### TaskCard
- Task title (truncated if long)
- Description preview (first 2 lines)
- Assignee agent avatar
- Status-appropriate styling

#### ScheduledTaskList
- List of all scheduled tasks for the project
- Each row shows: title, assigned agent avatar, schedule (human-readable), status badge (active/paused/completed), last run result (success/failure), next run countdown
- Inline controls: pause, resume, cancel, edit schedule
- Click to expand: full run history with output previews

### Agents

#### AgentAvatar
- Emoji avatar on a colored circular background
- Status dot overlay (bottom-right corner): green/yellow/blue/red
- Three sizes: sm (sidebar), md (messages), lg (profile)

#### AgentStatusBar
- Horizontal bar below the header showing all active agents
- Each entry: avatar + name + current action (e.g., "Marcus — using Write on server.ts")
- Only shows agents that are currently thinking or working
- Collapses when all agents are idle

---

## 12. Reliability & Resilience

### 12.1 Session Persistence

Agent sessions are the most critical state in the system. A lost session means an agent forgets the entire conversation history and starts fresh — wasting tokens and confusing the user.

**Strategy: Eager persistence with dual checkpoints.**

The `sessionId` is persisted to the database at **two** points during every execution:

1. **On `init` message** — as soon as the SDK emits the system init message with a session ID, it is written to the database. This happens before any agent work begins. If the stream breaks at any point after init, the session is already saved.

2. **On `result` message** — the session ID is written again at the end of successful execution as a secondary checkpoint.

If session resume fails on the next invocation (stale or corrupted session), the executor:
1. Logs a warning
2. Clears the stored `sessionId` in the database
3. Retries `query()` without `resume` (fresh session)
4. The new session ID is persisted normally

This ensures agents never get stuck in a "bad session" loop.

### 12.2 Timeout Protection

Every agent execution is bounded by a configurable timeout:

| Role | Timeout |
|------|---------|
| PM | 90 seconds |
| Frontend Dev | 120 seconds |
| Backend Dev | 120 seconds |
| Fullstack Dev | 120 seconds |
| Reviewer | 90 seconds |

Implementation uses `AbortController`:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

try {
  for await (const message of queryIter) {
    if (controller.signal.aborted) break;
    // ... process messages
  }
} finally {
  clearTimeout(timeout);
}
```

When a timeout fires:
- The `for await` loop breaks cleanly
- Agent status is set to "error" with message "Agent timed out after Xs"
- `agent.error` event emitted to frontend with `retryable: true`
- Session is preserved (already persisted on init) — retry can resume

### 12.3 Error Propagation

Errors flow through the full stack without being silently swallowed:

```
Agent Executor (catches, emits agent.error, updates status to "error")
      ↓ re-throws
Turn Manager (logs, propagates — does NOT silently continue to next agent)
      ↓ re-throws
Pipeline (catches, emits structured error to frontend)
      ↓
Frontend (ErrorBanner displays error with retry option)
```

Error events include:
- `agentId` — which agent failed
- `error` — human-readable error description
- `retryable` — whether a retry is likely to succeed (true for timeouts and transient errors, false for configuration errors)

### 12.4 Sandbox Isolation

Each project gets a dedicated Docker container for code execution:

```
┌──────────────────────────────────┐
│    Project Sandbox Container     │
│                                  │
│    /workspace/  (read-write)     │
│      └── all project files       │
│    /tmp/        (scratch)        │
│                                  │
│    Includes:                     │
│    • Node.js runtime             │
│    • Common dev tools            │
│    • Chromium (browser testing)  │
│                                  │
│    Cannot access:                │
│    • Host filesystem             │
│    • ~/.ssh, ~/.gnupg            │
│    • .env, API keys              │
│    • Other project sandboxes     │
│    • Host network (restricted)   │
└──────────────────────────────────┘
```

Container lifecycle:
- **Created** when a project is created via `POST /api/projects`
- **Persists** across agent invocations — both interactive and scheduled (not created/destroyed per message)
- **Torn down** when a project is deleted via `DELETE /api/projects/:id`

Developer agents' `cwd` is set to the container's `/workspace/` directory. All `Bash` tool invocations execute inside the container. The agent operates with `permissionMode: "bypassPermissions"` because the container itself is the security boundary — there's nothing dangerous the agent can reach.

### 12.5 Persistent Memory

Agents have long-term memory that survives across sessions, crashes, and context compaction via the `agent_memory` table.

**How it works:**
1. During execution, an agent can call `memory_save` to store a note (e.g., "User wants all API responses in JSON:API format")
2. On future invocations, the Context Builder runs `memory_search` with keywords from the current message and injects relevant memories into the prompt
3. Any agent can search memories saved by any other agent in the same project — creating shared institutional knowledge

**What gets saved:**
- User preferences ("prefers Tailwind over styled-components")
- Architectural decisions ("using PostgreSQL with Prisma ORM")
- Project conventions ("all API routes are in /api/v1/")
- Learned context ("the authentication system uses JWT with refresh tokens")
- Scheduled task notes ("nightly tests should also check database migrations")

**Durability:** Memories are stored in PostgreSQL with FTS indexing. They survive everything — session resets, agent crashes, server restarts, context compaction. The only way to lose them is to delete the project.

### 12.6 Budget Controls

Two-level execution budget enforcement prevents runaway API costs — especially important for autonomous scheduled tasks that run without supervision:

**Level 1: Turn limit (`maxTurns`)**
Limits the number of SDK round-trips (tool use → response cycles) per execution. Prevents agents from looping indefinitely.

**Level 2: Cost cap (`maxBudgetUsd`)**
Passed directly to the Claude Agent SDK. The SDK monitors token usage in real time and halts the agent mid-execution if the cost exceeds the cap. This is a hard stop, not a post-hoc report.

Defaults per role:

| Role | maxTurns | maxBudgetUsd |
|------|----------|-------------|
| PM | 15 | $0.50 |
| Frontend Dev | 25 | $1.00 |
| Backend Dev | 25 | $1.00 |
| Fullstack Dev | 25 | $1.00 |
| Reviewer | 15 | $0.50 |

When a budget cap is hit:
- The SDK terminates the `query()` stream
- The `for await` loop exits normally (not an error)
- The session is preserved for future resume
- A message is posted indicating the agent reached its budget limit
- For scheduled tasks, the run is logged as a budget-exceeded failure

### 12.7 Crash Recovery

The system is designed to survive unexpected restarts:

- **Scheduled tasks** — on startup, the scheduler checks for tasks with status `running` (orphaned by a crash). These are re-queued for immediate execution. The `consecutiveFailures` counter is not incremented for crash-related re-runs.
- **In-flight messages** — if an agent was mid-execution when the server crashed, the session is preserved (eager persistence on init). The user can re-send their message and the agent resumes from the saved session.
- **Turn manager state** — the in-memory turn queue is lost on crash. This is acceptable because all messages are persisted in PostgreSQL. On restart, no queued work is silently lost — it either completed (saved to DB) or didn't (user re-sends).
- **Sandbox containers** — Docker containers persist across server restarts. The sandbox is not torn down on crash — only on explicit project deletion.

---

## 13. Agent Teams Integration

### How It Works

The PM agent (Priya) acts as the team coordinator. When a user request requires multi-agent collaboration — feature implementation, refactoring, complex debugging — Priya uses Claude Agent SDK's Agent Teams to spawn the relevant Developer and Reviewer agents as teammates.

Teammates run concurrently within a shared context. They can:
- **Message each other directly** — a developer can ask the PM for clarification mid-coding, a reviewer can request changes from a developer
- **Share a task list** — coordinated via the MCP task tools, visible on the kanban board
- **See each other's work** — shared project context means agents don't duplicate effort
- **Ask questions and get answers mid-execution** — unlike sequential triggers where agents work in isolation

### SDK Integration

```typescript
const queryIter = query({
  prompt: context,
  options: {
    systemPrompt: pmConfig.systemPrompt,
    cwd: sandboxPath,
    allowedTools: pmConfig.allowedTools,
    mcpServers,
    maxTurns: pmConfig.maxTurns,
    maxBudgetUsd: pmConfig.maxBudgetUsd,
    permissionMode: "bypassPermissions",
    ...(agent.sessionId ? { resume: agent.sessionId } : {}),
  },
});
```

The PM's system prompt instructs it to spawn teammates for multi-step work. For simple questions or status checks, the PM responds directly without spawning a team.

### Coordination Model

```
PM (Priya) — Team Coordinator
  │
  ├── Spawns Luna (Frontend Dev) when frontend work is needed
  ├── Spawns Marcus (Backend Dev) when backend work is needed
  ├── Spawns Jasper (Fullstack Dev) for cross-cutting work
  ├── Spawns Suki (Reviewer) when code needs review
  │
  │   Within the team:
  │   ├── Teammates message each other directly
  │   ├── Task list is shared and updated via MCP tools
  │   ├── PM delegates, tracks progress, resolves conflicts
  │   ├── Reviewer provides feedback directly to developers
  │   └── PM summarizes completed work for the user
  │
  └── Team disbands when the user request is fulfilled
```

### Visibility in the UI

All agent-to-agent communication is surfaced in the channel UI:
- Agent Teams `SendMessage` calls are intercepted by the orchestration layer
- Each message is emitted as an `agent.collaboration` Socket.io event
- The frontend renders collaboration messages with a distinct visual style — different background color, sender → recipient indicator
- Users watch the full team discussion: PM delegating tasks, developers asking questions, reviewer giving feedback

This is the core differentiator — users don't just see the output of AI work. They see the process, the decisions, the tradeoffs, the back-and-forth. Trust is built through visibility.

### Trigger Fallback

If Agent Teams encounters an error (teammate spawn failure, SDK version incompatibility), the system automatically falls back to the trigger-based sequential pipeline. The trigger system is maintained as a reliable fallback — agents still take turns, still produce output, just without real-time collaboration.

---

## 14. What's Working

- Project creation with auto-provisioned agents, channels, and container sandbox
- Channel-based real-time chat with full message history and pagination
- Agent orchestration pipeline (routing → queuing → execution → streaming → broadcasting)
- Claude Agent SDK integration with streaming via async iterators, MCP tool servers, and session resume
- Agent Teams coordination — PM spawns teammates for real-time multi-agent collaboration
- Token-by-token streaming to the frontend with typing animation
- @mention system with autocomplete dropdown and priority routing
- Task CRUD — agents create, update, approve, and reject tasks via MCP tools
- Kanban board with 4 columns and real-time task updates via Socket.io
- Trigger-based autonomous workflows (PM → Dev → Reviewer → PM pipeline)
- Agent status indicators (idle/thinking/working/error) in sidebar and status bar
- Container sandbox — per-project Docker containers with isolated filesystem
- Code diff emission when Developer agents write or edit files
- Immediate session persistence — sessions survive mid-stream failures
- Timeout protection — AbortController wraps all agent executions
- Error propagation — errors flow from executor through to frontend with retry capability
- Persistent agent memory — FTS-indexed key-value store survives across sessions
- Budget controls — per-role maxTurns and maxBudgetUsd caps
- Agent-to-agent visibility — collaboration messages rendered in channel UI
- Memory-aware context building — relevant memories injected into agent prompts
- Task scheduler — cron, interval, and one-time scheduled tasks with failure handling and auto-pause
- Webhook API — three endpoints for external system integration with Bearer auth and idempotency
- Push notifications — email, Slack webhook, and browser push for autonomous task results
- Crash recovery — orphaned scheduled tasks re-queued on startup, sessions preserved across restarts
- Scheduled task panel — UI for viewing, pausing, resuming, and canceling scheduled tasks
- Activity markers — "while you were away" indicators in channels showing autonomous work
- Dark theme UI with full Slack-like layout

---

## 15. Future Roadmap

- **Human-in-the-loop approval gates** — Pause agent execution for user confirmation on sensitive operations (file deletions, external API calls). UI is wired (ApprovalBanner component), backend emitter exists, needs trigger logic.
- **Code diff viewer** — Frontend component to display `code.diff` events as a visual side-by-side or inline diff, rather than raw content.
- **Git integration** — Initialize a git repo in each sandbox, create branches per agent, auto-commit on task completion, view commit history in the UI.
- **Redis pub/sub** — Replace in-memory Socket.io broadcasting with Redis pub/sub to scale across multiple server instances.
- **User authentication** — Accounts, sessions, project ownership. Currently the app is single-user.
- **Project export** — Download the sandbox as a zip archive or clone it as a git repository.
- **Message threads** — Sub-conversations within channels for focused discussions without cluttering the main channel.
- **Task dependencies** — Blocking relationships between tasks. A task can declare that it depends on another task, and agents won't start it until dependencies are resolved.
- **More agents** — Architect (system design), DevOps (CI/CD and deployment), QA/Tester (automated test generation and execution).
- **Deploy to cloud** — Generate preview URLs for built applications. Spin up the sandbox as a publicly accessible container.
- **Kill switches** — Ability to halt a specific agent or all agents immediately from the UI. Emergency stop without waiting for execution to finish.
- **Cost dashboard** — Per-project and per-agent API spend tracking visible in the UI. Historical cost charts, budget utilization bars.

---

## 16. Running the Project

```bash
# Start infrastructure
docker-compose up -d          # PostgreSQL + Redis

# Install dependencies
npm install                   # All workspaces

# Set up database
npm run db:push -w backend    # Push Prisma schema
npm run db:seed -w backend    # Seed default project

# Configure environment
cp .env.example .env
# Set ANTHROPIC_API_KEY
# Set WEBHOOK_SECRET (for webhook API authentication)
# Set SMTP_* or SLACK_WEBHOOK_URL (optional, for push notifications)

# Run (development)
npm run dev                   # Backend :8000 + Frontend :3000

# Run (production — with process supervision)
npm run build
npm start                     # Or configure systemd/launchd for auto-restart
```

---

## 17. Differentiation

| Dimension | Existing Tools (Copilot, Claude Code, Cursor) | DevTeam AI |
|-----------|-----------------------------------------------|------------|
| Model | Single assistant doing everything | Specialized team of 5 agents with distinct roles and expertise |
| Collaboration | None — one model, one context | Real-time Agent Teams: agents message each other, ask questions, coordinate mid-task |
| Quality gates | None — user is the only QA | Built-in code review: Reviewer agent reads code, gives feedback, approves or rejects |
| Visibility | Input → output black box | Watch agents discuss, delegate, debate, and review in Slack-like channels |
| Task management | None | Integrated kanban board created and managed by agents |
| Interaction | Command-and-respond | Multi-channel workspace with @mentions, agent status, and agent-to-agent chat |
| Context management | One overloaded context window | Scoped context per agent per role + persistent memory across sessions |
| Autonomy | Works only when user is present | Scheduled tasks, webhook triggers, and push notifications — agents work while you sleep |
| Resilience | Session lost on error | Sessions survive crashes (eager persistence), timeout protection, structured error handling, crash recovery |
| Safety | Full host filesystem access | Container-sandboxed execution: agents can't touch the host |
| Cost control | None | Per-role turn limits and USD budget caps enforced by the SDK |
| Memory | Conversation-scoped only | Persistent FTS-indexed memory survives sessions, crashes, and restarts |
| External integration | None | Webhook API lets CI/CD, monitoring, and other systems trigger agent work |
