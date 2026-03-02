import { query } from "@anthropic-ai/claude-agent-sdk";
import { prisma } from "../db/client.js";
import { emitToChannel, emitToProject } from "../lib/socket.js";
import { getSandboxCwd } from "../lib/sandbox.js";
import { buildAgentConfigFromDb } from "../agents/config.js";
import type { AgentRecord } from "../agents/config.js";
import {
  buildAgentContext,
} from "./context-builder.js";
import {
  getStoredSessionId,
  persistSessionId,
  clearSessionId,
} from "./session-manager.js";
import {
  setExecutionContext,
  clearExecutionContext,
  drainTriggers,
} from "../mcp/context.js";
import { createMcpServersForAgent } from "../mcp/tools.js";
import { v4 as uuidv4 } from "uuid";

export interface ExecuteOptions {
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

export interface ExecuteResult {
  triggers: ReturnType<typeof drainTriggers>;
}

export async function executeAgent(opts: ExecuteOptions): Promise<ExecuteResult> {
  const {
    projectId,
    agentId,
    channelId,
    message,
    depth,
    executionSource,
    scheduledContext,
  } = opts;

  // Load agent and all project agents for dynamic config
  const [agent, projectAgents] = await Promise.all([
    prisma.agent.findUniqueOrThrow({ where: { id: agentId } }),
    prisma.agent.findMany({ where: { projectId } }),
  ]);

  const config = buildAgentConfigFromDb(
    agent as unknown as AgentRecord,
    projectAgents as unknown as AgentRecord[]
  );

  // Set execution context so MCP tools can access it
  setExecutionContext(agentId, {
    projectId,
    agentId,
    agentRole: agent.role,
    channelId,
    depth,
    executionSource,
    pendingTriggers: [],
  });

  // Update agent status to "thinking"
  await prisma.agent.update({
    where: { id: agentId },
    data: { status: "thinking", statusMessage: `${config.name} is thinking...` },
  });
  emitToProject(projectId, "agent.status", {
    agentId,
    status: "thinking",
    statusMessage: `${config.name} is thinking...`,
  });

  // Prepare streaming message
  const streamingMessageId = uuidv4();
  let isStreaming = false;

  // Build context
  const context = await buildAgentContext({
    projectId,
    agentId,
    channelId,
    currentMessage: message,
    scheduledContext,
  });

  // Get sandbox path
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
  });
  const cwd = getSandboxCwd(project.sandboxPath);

  // Get or resume session
  const storedSessionId = await getStoredSessionId(agentId);
  const mcpServers = createMcpServersForAgent(agentId, config.mcpServerNames);

  // Abort controller for timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, config.timeoutMs);

  let fullResponse = "";
  let sessionPersisted = false;

  try {
    const queryOptions: Parameters<typeof query>[0] = {
      prompt: context,
      options: {
        systemPrompt: config.systemPrompt,
        cwd,
        allowedTools: config.allowedTools,
        mcpServers,
        maxTurns: config.maxTurns,
        maxBudgetUsd: config.maxBudgetUsd,
        permissionMode: "bypassPermissions",
        abortController: controller,
        includePartialMessages: true,
        ...(storedSessionId ? { resume: storedSessionId } : {}),
      },
    };

    let queryIter: ReturnType<typeof query>;

    try {
      queryIter = query(queryOptions);
    } catch (err) {
      // Session resume failed — clear and retry fresh
      if (storedSessionId) {
        console.warn(`[Executor] Session resume failed for ${config.name}, retrying fresh`);
        await clearSessionId(agentId);
        const freshOptions = {
          ...queryOptions,
          options: { ...queryOptions.options },
        };
        delete (freshOptions.options as any).resume;
        queryIter = query(freshOptions);
      } else {
        throw err;
      }
    }

    for await (const event of queryIter) {
      if (controller.signal.aborted) break;

      if (event.type === "system" && (event as any).subtype === "init") {
        const sid = (event as any).session_id;
        if (sid && !sessionPersisted) {
          await persistSessionId(agentId, sid);
          sessionPersisted = true;
          console.log(`[Executor] ${config.name} session init: ${sid.slice(0, 8)}...`);
        }
      }

      if (event.type === "stream_event") {
        const streamEvent = (event as any).event;
        if (!streamEvent) continue;

        if (
          streamEvent.type === "content_block_delta" &&
          streamEvent.delta?.type === "text_delta" &&
          streamEvent.delta?.text
        ) {
          const token: string = streamEvent.delta.text;

          if (!isStreaming) {
            isStreaming = true;
            await prisma.agent.update({
              where: { id: agentId },
              data: { status: "working", statusMessage: `${config.name} is responding...` },
            });
            emitToProject(projectId, "agent.status", {
              agentId,
              status: "working",
              statusMessage: `${config.name} is responding...`,
            });
          }

          fullResponse += token;
          emitToChannel(channelId, "message.stream", {
            messageId: streamingMessageId,
            agentId,
            channelId,
            token,
          });
        }

        const partialSid = (event as any).session_id;
        if (partialSid && !sessionPersisted) {
          await persistSessionId(agentId, partialSid);
          sessionPersisted = true;
        }
      }

      if (event.type === "assistant") {
        const msg = (event as any).message;
        if (!msg?.content) continue;

        const assistantSid = (event as any).session_id;
        if (assistantSid && !sessionPersisted) {
          await persistSessionId(agentId, assistantSid);
          sessionPersisted = true;
        }

        for (const block of msg.content) {
          if (block.type === "text" && block.text) {
            if (!isStreaming) {
              fullResponse = block.text;
              emitToChannel(channelId, "message.stream", {
                messageId: streamingMessageId,
                agentId,
                channelId,
                token: block.text,
              });
              isStreaming = true;
            }
          } else if (block.type === "tool_use") {
            const toolStatusMsg = `${config.name} is using ${block.name}...`;
            await prisma.agent.update({
              where: { id: agentId },
              data: { status: "working", statusMessage: toolStatusMsg },
            });
            emitToProject(projectId, "agent.status", {
              agentId,
              status: "working",
              statusMessage: toolStatusMsg,
            });

            if (
              (block.name === "Write" || block.name === "Edit") &&
              block.input
            ) {
              const input = block.input as any;
              emitToProject(projectId, "code.diff", {
                projectId,
                file: input.file_path ?? input.path ?? "unknown",
                action: block.name === "Write" ? "write" : "edit",
                content: input.content ?? input.new_string ?? "",
              });
            }
          }
        }
      }

      if (event.type === "result") {
        const resultEvent = event as any;
        console.log(
          `[Executor] ${config.name} result: ${resultEvent.subtype}, cost=$${resultEvent.total_cost_usd?.toFixed(3) ?? "??"}, turns=${resultEvent.num_turns ?? "??"}`
        );

        if (!fullResponse && resultEvent.result) {
          fullResponse = resultEvent.result;
        }
      }
    }

    if (fullResponse.trim()) {
      const savedMessage = await prisma.message.create({
        data: {
          id: streamingMessageId,
          channelId,
          role: "assistant",
          agentId,
          content: fullResponse.trim(),
          metadata:
            executionSource !== "user"
              ? { autonomous: true, scheduled: executionSource === "scheduled", webhook: executionSource === "webhook", depth }
              : undefined,
        },
        include: { agent: true },
      });

      emitToChannel(channelId, "message.stream.end", {
        messageId: streamingMessageId,
        agentId,
        channelId,
      });
      emitToChannel(channelId, "message.new", savedMessage as any);
    }

    const triggers = drainTriggers(agentId);
    return { triggers };

  } catch (err: unknown) {
    const errorMsg =
      controller.signal.aborted
        ? `${config.name} timed out after ${config.timeoutMs / 1000}s`
        : (err as Error).message ?? "Unknown error";

    console.error(`[Executor] ${config.name} error:`, errorMsg);

    await prisma.agent.update({
      where: { id: agentId },
      data: { status: "error", statusMessage: errorMsg },
    });
    emitToProject(projectId, "agent.error", {
      agentId,
      error: errorMsg,
      retryable: controller.signal.aborted,
    });
    emitToProject(projectId, "agent.status", {
      agentId,
      status: "error",
      statusMessage: errorMsg,
    });

    const errorMessage = await prisma.message.create({
      data: {
        channelId,
        role: "assistant",
        agentId,
        content: `\u26a0\ufe0f ${errorMsg}`,
        metadata: { autonomous: executionSource !== "user" },
      },
      include: { agent: true },
    });
    emitToChannel(channelId, "message.new", errorMessage as any);

    throw err;
  } finally {
    clearTimeout(timeout);
    clearExecutionContext(agentId);

    await prisma.agent
      .update({
        where: { id: agentId },
        data: { status: "idle", statusMessage: null },
      })
      .catch(() => {});
    emitToProject(projectId, "agent.status", {
      agentId,
      status: "idle",
      statusMessage: null,
    });
  }
}
