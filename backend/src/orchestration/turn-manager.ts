import { executeAgent } from "./executor.js";

interface QueuedTurn {
  projectId: string;
  agentId: string;
  channelId: string;
  message: string;
  depth: number;
  executionSource: "user" | "scheduled" | "webhook";
  scheduledContext?: {
    taskTitle: string;
    scheduleType: string;
    scheduleValue: string;
  };
}

// Per-AGENT queues ensure sequential execution per agent (not per channel).
const agentQueues = new Map<string, QueuedTurn[]>();
const agentRunning = new Map<string, boolean>();

async function processAgentQueue(agentId: string): Promise<void> {
  if (agentRunning.get(agentId)) return;
  agentRunning.set(agentId, true);

  const queue = agentQueues.get(agentId) ?? [];

  while (queue.length > 0) {
    const turn = queue.shift()!;
    try {
      const result = await executeAgent({
        projectId: turn.projectId,
        agentId: turn.agentId,
        channelId: turn.channelId,
        message: turn.message,
        depth: turn.depth,
        executionSource: turn.executionSource,
        scheduledContext: turn.scheduledContext,
      });

      // Process triggers — enqueue them
      for (const trigger of result.triggers) {
        await enqueueTurn({
          projectId: turn.projectId,
          agentId: trigger.targetAgentId, // prefer direct agentId
          agentRole: trigger.targetRole,   // fallback for lookup
          channelId: trigger.channelId,
          message: trigger.message,
          depth: trigger.depth,
          executionSource: "user",
        });
      }
    } catch (err) {
      console.error(`[TurnManager] Error for agent ${agentId}:`, err);
    }
  }

  agentRunning.set(agentId, false);
}

export async function enqueueTurn(turn: {
  projectId: string;
  agentId?: string;
  agentRole?: string;
  channelId: string;
  message: string;
  depth: number;
  executionSource: "user" | "scheduled" | "webhook";
  scheduledContext?: {
    taskTitle: string;
    scheduleType: string;
    scheduleValue: string;
  };
}): Promise<void> {
  const { projectId } = turn;

  // Resolve agentId if not provided
  let agentId = turn.agentId ?? "";
  if (!agentId) {
    const { prisma } = await import("../db/client.js");
    // Try finding by role
    if (turn.agentRole) {
      const agent = await prisma.agent.findFirst({
        where: { projectId, role: turn.agentRole },
      });
      if (agent) {
        agentId = agent.id;
      }
    }
    if (!agentId) {
      console.warn(`[TurnManager] No agent found for role=${turn.agentRole} in project ${projectId}`);
      return;
    }
  }

  const completeTurn: QueuedTurn = {
    projectId: turn.projectId,
    agentId,
    channelId: turn.channelId,
    message: turn.message,
    depth: turn.depth,
    executionSource: turn.executionSource,
    scheduledContext: turn.scheduledContext,
  };

  if (!agentQueues.has(agentId)) {
    agentQueues.set(agentId, []);
  }
  agentQueues.get(agentId)!.push(completeTurn);

  // Start processing (non-blocking)
  processAgentQueue(agentId).catch((err) =>
    console.error("[TurnManager] Unhandled error:", err)
  );
}
