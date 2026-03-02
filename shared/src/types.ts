// ─── Agent ───────────────────────────────────────────────────────────────────

export type AgentRole =
  | "pm"
  | "frontend-dev"
  | "backend-dev"
  | "fullstack-dev"
  | "reviewer"
  | (string & {});

export type AgentSkill =
  | "file_ops"
  | "task_management"
  | "code_review"
  | "communication"
  | "memory";

export const ALL_SKILLS: AgentSkill[] = [
  "file_ops",
  "task_management",
  "code_review",
  "communication",
  "memory",
];

export type AgentStatus = "idle" | "thinking" | "working" | "error";

export interface Agent {
  id: string;
  projectId: string;
  role: string;
  name: string;
  title: string;
  avatar: string;
  color: string;
  status: AgentStatus;
  statusMessage: string | null;
  sessionId: string | null;
  isCustom: boolean;
  systemPrompt: string | null;
  skills: AgentSkill[];
  channels: string[];
  mentionName: string;
  timeoutMs: number;
  maxTurns: number;
  maxBudgetUsd: number;
  createdAt: string;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface NotificationConfig {
  email?: string;
  slackWebhookUrl?: string;
  browserPush?: boolean;
  notifyOn?: "all" | "failures" | "webhooks_only";
}

export type InteractionMode = "newbie" | "advanced";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  sandboxPath: string;
  interactionMode: InteractionMode;
  notificationConfig: NotificationConfig | null;
  webhookToken: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Channel ──────────────────────────────────────────────────────────────────

export type ChannelName =
  | "general"
  | "code-review"
  | "tasks"
  | "frontend"
  | "backend";

export interface Channel {
  id: string;
  projectId: string;
  name: ChannelName | string;
  description: string | null;
  createdAt: string;
}

// ─── Message ──────────────────────────────────────────────────────────────────

export interface MessageMetadata {
  autonomous?: boolean;
  scheduled?: boolean;
  webhook?: boolean;
  depth?: number;
  source?: string;
  crossPost?: boolean;
  retryable?: boolean;
}

export interface Message {
  id: string;
  channelId: string;
  role: "user" | "assistant";
  agentId: string | null;
  content: string;
  metadata: MessageMetadata | null;
  createdAt: string;
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeAgentId: string | null;
  createdByAgentId: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: Agent | null;
  createdBy?: Agent | null;
}

// ─── Memory ───────────────────────────────────────────────────────────────────

export interface AgentMemory {
  id: string;
  projectId: string;
  agentId: string;
  key: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Scheduled Tasks ─────────────────────────────────────────────────────────

export type ScheduleType = "cron" | "interval" | "once";
export type ScheduledTaskStatus = "active" | "paused" | "completed" | "running";

export interface ScheduledTask {
  id: string;
  projectId: string;
  assigneeAgentId: string;
  createdByAgentId: string;
  channelId: string;
  title: string;
  prompt: string;
  scheduleType: ScheduleType;
  scheduleValue: string;
  nextRun: string | null;
  status: ScheduledTaskStatus;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledTaskRun {
  id: string;
  scheduledTaskId: string;
  status: "success" | "failure";
  durationMs: number;
  output: string | null;
  error: string | null;
  createdAt: string;
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export interface WebhookLog {
  id: string;
  projectId: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  idempotencyKey: string | null;
  status: "accepted" | "rejected" | "duplicate";
  responseCode: number;
  createdAt: string;
}

// ─── Socket.io Events ────────────────────────────────────────────────────────

// Client → Server
export interface ClientToServerEvents {
  "message.send": (payload: {
    channelId: string;
    content: string;
    projectId: string;
  }) => void;
  "channel.join": (payload: { channelId: string }) => void;
  "channel.leave": (payload: { channelId: string }) => void;
  "project.join": (payload: { projectId: string }) => void;
  "project.leave": (payload: { projectId: string }) => void;
}

// Server → Client
export interface ServerToClientEvents {
  "message.new": (message: Message & { agent?: Agent | null }) => void;
  "message.stream": (payload: {
    messageId: string;
    agentId: string;
    channelId: string;
    token: string;
  }) => void;
  "message.stream.end": (payload: {
    messageId: string;
    agentId: string;
    channelId: string;
  }) => void;
  "task.updated": (task: Task) => void;
  "agent.status": (payload: {
    agentId: string;
    status: AgentStatus;
    statusMessage: string | null;
  }) => void;
  "agent.error": (payload: {
    agentId: string;
    error: string;
    retryable: boolean;
  }) => void;
  "code.diff": (payload: {
    projectId: string;
    file: string;
    action: "write" | "edit" | "delete";
    content: string;
  }) => void;
  "agent.collaboration": (payload: {
    fromAgentId: string;
    toAgentId: string;
    channelId: string;
    content: string;
  }) => void;
  "scheduled.updated": (payload: {
    id: string;
    projectId: string;
    title: string;
    status: ScheduledTaskStatus;
    nextRun: string | null;
    lastRunStatus: string | null;
  }) => void;
  "scheduled.run": (payload: {
    scheduledTaskId: string;
    status: "success" | "failure";
    output: string | null;
    durationMs: number;
  }) => void;
  "webhook.received": (payload: {
    projectId: string;
    endpoint: string;
    status: string;
  }) => void;
  "agent.created": (agent: Agent) => void;
  "agent.updated": (agent: Agent) => void;
  "agent.deleted": (payload: { agentId: string; projectId: string }) => void;
}

// ─── Routing ──────────────────────────────────────────────────────────────────

export type RoutingReason =
  | "mentioned"
  | "channel_member"
  | "autonomous"
  | "scheduled"
  | "webhook";

export interface RoutedAgent {
  agentId: string;
  role: AgentRole;
  reason: RoutingReason;
  channelId?: string;
}
