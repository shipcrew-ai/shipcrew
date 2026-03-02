# Claude Code PM (CCPM)

This project uses [CCPM](https://github.com/automazeio/ccpm) for spec-driven project management inside Claude Code. It turns PRDs into GitHub issues and coordinates parallel AI agents to ship features.

## Setup

CCPM is already installed in this repo under `.claude/`. To get it working:

```bash
# 1. Run inside Claude Code
/pm:init
```

This will:
- Install GitHub CLI (`gh`) if missing
- Authenticate with GitHub
- Install the `gh-sub-issue` extension
- Create GitHub labels (`epic`, `task`)
- Set up required directories

```bash
# 2. Create project context
/context:create
```

## Workflow

The core loop is five steps:

```
PRD → Epic → Tasks → GitHub Issues → Execute
```

### 1. Write a PRD

```bash
/pm:prd-new feature-name
```

Claude brainstorms with you and writes a Product Requirements Document.

**Output:** `.claude/prds/feature-name.md`

### 2. Parse PRD into an epic

```bash
/pm:prd-parse feature-name
```

Converts the PRD into a technical implementation plan with architecture decisions.

**Output:** `.claude/epics/feature-name/epic.md`

### 3. Break into tasks

```bash
/pm:epic-decompose feature-name
```

Creates individual task files with acceptance criteria and effort estimates.

**Output:** `.claude/epics/feature-name/001.md`, `002.md`, etc.

### 4. Push to GitHub

```bash
/pm:epic-sync feature-name
```

Creates GitHub issues for the epic and all tasks, with labels and parent-child relationships.

> **Shortcut:** `/pm:epic-oneshot feature-name` does steps 3 + 4 together.

### 5. Start working

```bash
/pm:issue-start 1234      # Work on a specific issue
/pm:issue-sync 1234       # Push progress to GitHub
/pm:next                  # Find the next priority task
```

## Command Reference

Run `/pm:help` for the full list. Here's the summary:

### PRDs
| Command | Description |
|---------|-------------|
| `/pm:prd-new <name>` | Create new PRD via brainstorming |
| `/pm:prd-parse <name>` | Convert PRD to epic |
| `/pm:prd-list` | List all PRDs |
| `/pm:prd-edit <name>` | Edit a PRD |
| `/pm:prd-status` | Show PRD implementation status |

### Epics
| Command | Description |
|---------|-------------|
| `/pm:epic-decompose <name>` | Break epic into tasks |
| `/pm:epic-sync <name>` | Push to GitHub |
| `/pm:epic-oneshot <name>` | Decompose + sync in one step |
| `/pm:epic-list` | List all epics |
| `/pm:epic-show <name>` | Show epic details and tasks |
| `/pm:epic-status [name]` | Show epic progress |
| `/pm:epic-start <name>` | Launch parallel agents |
| `/pm:epic-close <name>` | Mark epic complete |
| `/pm:epic-edit <name>` | Edit epic |
| `/pm:epic-refresh <name>` | Recalculate progress from tasks |
| `/pm:epic-merge <name>` | Merge epic branch back to main |

### Issues
| Command | Description |
|---------|-------------|
| `/pm:issue-start <num>` | Start working on an issue |
| `/pm:issue-sync <num>` | Push updates to GitHub |
| `/pm:issue-show <num>` | Show issue details |
| `/pm:issue-status <num>` | Check issue status |
| `/pm:issue-close <num>` | Mark issue done |
| `/pm:issue-reopen <num>` | Reopen a closed issue |
| `/pm:issue-edit <num>` | Edit issue |
| `/pm:issue-analyze <num>` | Analyze for parallel work streams |

### Dashboard
| Command | Description |
|---------|-------------|
| `/pm:next` | Next priority task |
| `/pm:status` | Project dashboard |
| `/pm:standup` | Daily standup report |
| `/pm:blocked` | Show blocked tasks |
| `/pm:in-progress` | List work in progress |

### Sync & Maintenance
| Command | Description |
|---------|-------------|
| `/pm:sync` | Full bidirectional sync with GitHub |
| `/pm:import <issue>` | Import existing GitHub issues |
| `/pm:validate` | Check system integrity |
| `/pm:clean` | Archive completed work |
| `/pm:search <query>` | Search across all content |

## Directory Structure

```
.claude/
├── prds/                  # Product requirement documents
├── epics/                 # Epic plans and task breakdowns
│   └── feature-name/
│       ├── epic.md        # Implementation plan
│       ├── 001.md         # Task (renamed to issue ID after sync)
│       └── updates/       # Progress updates
├── context/               # Project context files (for agent onboarding)
├── commands/pm/           # CCPM command definitions
├── scripts/pm/            # Shell scripts for commands
├── agents/                # Agent definitions
├── rules/                 # Development workflow rules
└── ccpm.config            # GitHub repo detection config
```

## Context System

CCPM includes a context system that helps agents understand your project:

```bash
/context:create    # Analyze project and generate context docs
/context:prime     # Load context at the start of a session
/context:update    # Update context after changes
```

Context files live in `.claude/context/` and include project overview, tech stack, structure, style guide, and progress tracking.

## Parallel Execution

CCPM supports multiple agents working on the same epic simultaneously:

```bash
/pm:issue-analyze 1234     # Find parallelizable work streams
/pm:epic-start feature      # Launch agents in a worktree
/pm:epic-merge feature      # Merge back when done
```

Agents coordinate through Git commits and progress files, working on different files to avoid conflicts.

## File Naming

- Tasks start as `001.md`, `002.md` during decomposition
- After GitHub sync, renamed to `{issue-number}.md` (e.g., `1234.md`)
- Issue #1234 = file `.claude/epics/feature-name/1234.md`

## Tips

- Run `/pm:next` to find what to work on
- Run `/pm:status` for a quick project overview
- Use `/pm:epic-oneshot` to skip the decompose-then-sync two-step
- All local-first: changes only hit GitHub when you explicitly sync
- Add `.claude/epics/` to `.gitignore` (local workspace, not for version control)
