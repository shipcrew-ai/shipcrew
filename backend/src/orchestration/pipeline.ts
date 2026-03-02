import { prisma } from "../db/client.js";
import { emitToChannel } from "../lib/socket.js";
import { routeMessage } from "./router.js";
import { enqueueTurn } from "./turn-manager.js";
export interface PipelineInput {
  projectId: string;
  channelId: string;
  content: string;
  senderRole: "user" | "system";
  senderId?: string; // userId or agentId
  executionSource?: "user" | "scheduled" | "webhook";
  depth?: number;
  scheduledContext?: {
    taskTitle: string;
    scheduleType: string;
    scheduleValue: string;
  };
  metadata?: Record<string, unknown>;
}

export async function runPipeline(input: PipelineInput): Promise<void> {
  const {
    projectId,
    channelId,
    content,
    senderRole,
    senderId,
    executionSource = "user",
    depth = 0,
    scheduledContext,
    metadata,
  } = input;

  // 1. Persist the incoming message
  const message = await prisma.message.create({
    data: {
      channelId,
      role: senderRole,
      agentId: senderRole === "user" ? null : senderId ?? null,
      content,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
    include: { agent: true },
  });

  // 2. Broadcast the message to the channel
  emitToChannel(channelId, "message.new", message as any);

  // 3. Route to agents
  const routed = await routeMessage(projectId, channelId, content);

  // 4. Enqueue each routed agent (non-blocking)
  for (const routedAgent of routed) {
    await enqueueTurn({
      projectId,
      agentId: routedAgent.agentId,
      agentRole: routedAgent.role,
      channelId: routedAgent.channelId ?? channelId,
      message: content,
      depth,
      executionSource,
      scheduledContext,
    });
  }
}
