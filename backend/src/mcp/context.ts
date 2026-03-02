export interface ExecutionContext {
  projectId: string;
  agentId: string;
  agentRole: string;
  channelId: string;
  depth: number;
  executionSource: "user" | "scheduled" | "webhook";
  pendingTriggers: PendingTrigger[];
}

export interface PendingTrigger {
  targetAgentId?: string;
  targetRole: string;
  channelId: string;
  message: string;
  depth: number;
  source: string;
}

// Per-agent execution context storage (keyed by agentId)
const executionContexts = new Map<string, ExecutionContext>();

export function setExecutionContext(
  agentId: string,
  ctx: ExecutionContext
): void {
  executionContexts.set(agentId, ctx);
}

export function getExecutionContext(
  agentId: string
): ExecutionContext | undefined {
  return executionContexts.get(agentId);
}

export function clearExecutionContext(agentId: string): void {
  executionContexts.delete(agentId);
}

export function queueTrigger(
  agentId: string,
  trigger: PendingTrigger
): void {
  const ctx = executionContexts.get(agentId);
  if (ctx) {
    ctx.pendingTriggers.push(trigger);
  }
}

export function drainTriggers(agentId: string): PendingTrigger[] {
  const ctx = executionContexts.get(agentId);
  if (!ctx) return [];
  const triggers = [...ctx.pendingTriggers];
  ctx.pendingTriggers = [];
  return triggers;
}
