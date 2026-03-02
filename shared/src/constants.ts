import type { AgentRole, AgentSkill, ChannelName } from "./types.js";

// ─── Skill Definitions ──────────────────────────────────────────────────────

export interface SkillDefinition {
  label: string;
  description: string;
  sdkTools: string[];
  mcpServers: string[];
}

export const SKILL_DEFINITIONS: Record<AgentSkill, SkillDefinition> = {
  file_ops: {
    label: "File Operations",
    description: "Read, write, edit, and search files in the project sandbox",
    sdkTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    mcpServers: ["dev-tools"],
  },
  task_management: {
    label: "Task Management",
    description: "Create, update, assign, and schedule tasks on the kanban board",
    sdkTools: ["Read", "Glob", "Grep"],
    mcpServers: ["pm-tools"],
  },
  code_review: {
    label: "Code Review",
    description: "Review code, approve or reject tasks with feedback",
    sdkTools: ["Read", "Glob", "Grep"],
    mcpServers: ["reviewer-tools"],
  },
  communication: {
    label: "Communication",
    description: "Send messages to channels and list available channels",
    sdkTools: [],
    mcpServers: ["common-tools"],
  },
  memory: {
    label: "Memory",
    description: "Save and search persistent memory notes across sessions",
    sdkTools: [],
    mcpServers: ["common-tools"],
  },
};

export const DEFAULT_SKILLS_FOR_ROLE: Record<string, AgentSkill[]> = {
  pm: ["task_management", "communication", "memory"],
  "frontend-dev": ["file_ops", "communication", "memory"],
  "backend-dev": ["file_ops", "communication", "memory"],
  "fullstack-dev": ["file_ops", "communication", "memory"],
  reviewer: ["code_review", "communication", "memory"],
};

// ─── Agent Definitions ───────────────────────────────────────────────────────

export const AGENT_DEFINITIONS: Record<
  AgentRole,
  {
    name: string;
    title: string;
    avatar: string;
    color: string;
    channels: ChannelName[];
    mentionName: string;
    skills: AgentSkill[];
    timeoutMs: number;
    maxTurns: number;
    maxBudgetUsd: number;
  }
> = {
  pm: {
    name: "Priya",
    title: "Project Manager",
    avatar: "👩‍💼",
    color: "#7C3AED",
    channels: ["general", "tasks"],
    mentionName: "priya",
    skills: ["task_management", "communication", "memory"],
    timeoutMs: 90_000,
    maxTurns: 15,
    maxBudgetUsd: 0.5,
  },
  "frontend-dev": {
    name: "Luna",
    title: "Frontend Developer",
    avatar: "👩‍💻",
    color: "#DB2777",
    channels: ["general", "frontend"],
    mentionName: "luna",
    skills: ["file_ops", "communication", "memory"],
    timeoutMs: 120_000,
    maxTurns: 25,
    maxBudgetUsd: 1.0,
  },
  "backend-dev": {
    name: "Marcus",
    title: "Backend Developer",
    avatar: "👨‍💻",
    color: "#0891B2",
    channels: ["general", "backend"],
    mentionName: "marcus",
    skills: ["file_ops", "communication", "memory"],
    timeoutMs: 120_000,
    maxTurns: 25,
    maxBudgetUsd: 1.0,
  },
  "fullstack-dev": {
    name: "Jasper",
    title: "Fullstack Developer",
    avatar: "🧑‍💻",
    color: "#059669",
    channels: ["general"],
    mentionName: "jasper",
    skills: ["file_ops", "communication", "memory"],
    timeoutMs: 120_000,
    maxTurns: 25,
    maxBudgetUsd: 1.0,
  },
  reviewer: {
    name: "Suki",
    title: "Code Reviewer",
    avatar: "🔍",
    color: "#D97706",
    channels: ["code-review"],
    mentionName: "suki",
    skills: ["code_review", "communication", "memory"],
    timeoutMs: 90_000,
    maxTurns: 15,
    maxBudgetUsd: 0.5,
  },
};

// ─── Channel Definitions ─────────────────────────────────────────────────────

export const CHANNEL_DEFINITIONS: Record<
  ChannelName,
  { description: string; defaultAgentRole: AgentRole }
> = {
  general: {
    description: "Main project workspace — all team updates",
    defaultAgentRole: "pm",
  },
  "code-review": {
    description: "Code review discussions and approvals",
    defaultAgentRole: "reviewer",
  },
  tasks: {
    description: "Task management and planning",
    defaultAgentRole: "pm",
  },
  frontend: {
    description: "Frontend development — React, CSS, UI",
    defaultAgentRole: "frontend-dev",
  },
  backend: {
    description: "Backend development — APIs, database, auth",
    defaultAgentRole: "backend-dev",
  },
};

export const ALL_CHANNELS: ChannelName[] = [
  "general",
  "tasks",
  "frontend",
  "backend",
  "code-review",
];

export const ALL_ROLES: AgentRole[] = [
  "pm",
  "frontend-dev",
  "backend-dev",
  "fullstack-dev",
  "reviewer",
];

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export const MAX_PIPELINE_DEPTH = 10;
export const SCHEDULER_POLL_INTERVAL_MS = 60_000;
export const SESSION_PERSIST_KEY = "sessionId";

// ─── Scheduler Retry ─────────────────────────────────────────────────────────

export const SCHEDULER_RETRY_DELAYS_MS = [5_000, 15_000, 45_000];
export const SCHEDULER_MAX_CONSECUTIVE_FAILURES = 3;

// ─── Budget defaults ─────────────────────────────────────────────────────────

export const DEFAULT_MESSAGE_HISTORY_LIMIT = 20;
export const DEFAULT_TASK_HISTORY_LIMIT = 20;
export const DEFAULT_MEMORY_SEARCH_LIMIT = 5;

// ─── Model ───────────────────────────────────────────────────────────────────

export const CLAUDE_MODEL = "claude-sonnet-4-6";
