import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { emitToChannel, emitToProject } from "../lib/socket.js";
import { getExecutionContext, queueTrigger } from "./context.js";
import { parseJsonArray } from "../lib/json-fields.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get the best "work channel" for an agent (first non-general channel, or general) */
function getWorkChannel(agentChannels: string[]): string {
  const nonGeneral = agentChannels.find((c) => c !== "general");
  return nonGeneral ?? agentChannels[0] ?? "general";
}

function computeNextRun(
  scheduleType: string,
  scheduleValue: string
): Date | null {
  try {
    if (scheduleType === "once") {
      return new Date(scheduleValue);
    }
    if (scheduleType === "interval") {
      const ms = parseInt(scheduleValue, 10);
      return new Date(Date.now() + ms);
    }
    if (scheduleType === "cron") {
      return new Date(Date.now() + 60_000);
    }
    return null;
  } catch {
    return null;
  }
}

// ─── PM Tools ────────────────────────────────────────────────────────────────

export function createPmToolServer(agentId: string) {
  return createSdkMcpServer({
    name: "pm-tools",
    version: "1.0.0",
    tools: [
      tool(
        "create_task",
        "Create a new task on the kanban board. Optionally assign to a developer by role or @mentionName.",
        {
          title: z.string().describe("Task title"),
          description: z.string().optional().describe("Task description"),
          assignee: z
            .string()
            .optional()
            .describe(
              "Developer role name (e.g. frontend-dev) or @mentionName (e.g. luna) to assign to"
            ),
        },
        async (args) => {
          const { title, description, assignee } = args;
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          const agents = await prisma.agent.findMany({
            where: { projectId: ctx.projectId },
          });
          // Match by role, mentionName, or name
          const assigneeAgent = assignee
            ? agents.find(
                (a) =>
                  a.role === assignee ||
                  a.mentionName === assignee ||
                  a.name.toLowerCase() === assignee.toLowerCase()
              )
            : null;
          const creatorAgent = agents.find((a) => a.id === ctx.agentId);

          const task = await prisma.task.create({
            data: {
              projectId: ctx.projectId,
              title,
              description,
              status: "todo",
              assigneeAgentId: assigneeAgent?.id ?? null,
              createdByAgentId: ctx.agentId,
            },
            include: { assignee: true, createdBy: true },
          });

          emitToProject(ctx.projectId, "task.updated", task as any);

          // Queue trigger for assigned developer in their work channel
          if (assigneeAgent && ctx.depth < 10) {
            const workChannelName = getWorkChannel(parseJsonArray(assigneeAgent.channels));
            const channel = await prisma.channel.findFirst({
              where: { projectId: ctx.projectId, name: workChannelName },
            });
            if (channel) {
              queueTrigger(agentId, {
                targetAgentId: assigneeAgent.id,
                targetRole: assigneeAgent.role,
                channelId: channel.id,
                message: `You have been assigned a new task: "${title}"${description ? `\n\n${description}` : ""}\n\nTask ID: ${task.id}`,
                depth: ctx.depth + 1,
                source: `${creatorAgent?.role ?? "pm"}:create_task`,
              });
            }
          }

          return {
            content: [
              {
                type: "text" as const,
                text: `Task created: "${title}" (id: ${task.id})${assigneeAgent ? `, assigned to ${assigneeAgent.name}` : ""}`,
              },
            ],
          };
        }
      ),
      tool(
        "update_task",
        "Update a task's title, description, status, or assignee",
        {
          taskId: z.string().describe("Task ID"),
          title: z.string().optional().describe("New title"),
          description: z.string().optional().describe("New description"),
          status: z
            .enum(["todo", "in_progress", "review", "done"])
            .optional()
            .describe("New status"),
          assignee: z
            .string()
            .optional()
            .describe("Developer role name or @mentionName to reassign to"),
        },
        async (args) => {
          const { taskId, title, description, status, assignee } = args;
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          const agents = await prisma.agent.findMany({
            where: { projectId: ctx.projectId },
          });
          const assigneeAgent = assignee
            ? agents.find(
                (a) =>
                  a.role === assignee ||
                  a.mentionName === assignee ||
                  a.name.toLowerCase() === assignee.toLowerCase()
              )
            : undefined;

          const task = await prisma.task.update({
            where: { id: taskId },
            data: {
              ...(title && { title }),
              ...(description !== undefined && { description }),
              ...(status && { status }),
              ...(assigneeAgent && { assigneeAgentId: assigneeAgent.id }),
            },
            include: { assignee: true, createdBy: true },
          });

          emitToProject(ctx.projectId, "task.updated", task as any);

          return {
            content: [
              { type: "text" as const, text: `Task updated: "${task.title}"` },
            ],
          };
        }
      ),
      tool(
        "list_tasks",
        "List all tasks in the project with status and assignee",
        {},
        async () => {
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          const tasks = await prisma.task.findMany({
            where: { projectId: ctx.projectId },
            include: { assignee: true, createdBy: true },
            orderBy: { createdAt: "desc" },
            take: 20,
          });

          const summary = tasks
            .map(
              (t) =>
                `[${t.status.toUpperCase()}] ${t.title}${t.assignee ? ` → ${t.assignee.name}` : ""} (id: ${t.id})`
            )
            .join("\n");

          return {
            content: [
              {
                type: "text" as const,
                text: tasks.length ? summary : "No tasks yet.",
              },
            ],
          };
        }
      ),
      tool(
        "schedule_task",
        "Schedule a recurring or one-time task for autonomous execution",
        {
          title: z.string().describe("Human-readable task name"),
          prompt: z.string().describe("What the agent should do"),
          assigneeRole: z
            .string()
            .describe(
              "Agent role name or @mentionName to run this task"
            ),
          channelName: z.string().describe("Channel to post results in"),
          scheduleType: z
            .enum(["cron", "interval", "once"])
            .describe("Schedule type"),
          scheduleValue: z
            .string()
            .describe("Cron expression, interval in ms, or ISO timestamp"),
        },
        async (args) => {
          const {
            title,
            prompt,
            assigneeRole,
            channelName,
            scheduleType,
            scheduleValue,
          } = args;
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          const [agents, channel] = await Promise.all([
            prisma.agent.findMany({ where: { projectId: ctx.projectId } }),
            prisma.channel.findFirst({
              where: { projectId: ctx.projectId, name: channelName },
            }),
          ]);

          const assigneeAgent = agents.find(
            (a) =>
              a.role === assigneeRole ||
              a.mentionName === assigneeRole ||
              a.name.toLowerCase() === assigneeRole.toLowerCase()
          );
          if (!assigneeAgent)
            throw new Error(`No agent matching: ${assigneeRole}`);
          if (!channel)
            throw new Error(`No channel named: ${channelName}`);

          const nextRun = computeNextRun(scheduleType, scheduleValue);

          const scheduledTask = await prisma.scheduledTask.create({
            data: {
              projectId: ctx.projectId,
              assigneeAgentId: assigneeAgent.id,
              createdByAgentId: ctx.agentId,
              channelId: channel.id,
              title,
              prompt,
              scheduleType,
              scheduleValue,
              nextRun,
              status: "active",
            },
          });

          emitToProject(ctx.projectId, "scheduled.updated", {
            id: scheduledTask.id,
            projectId: ctx.projectId,
            title,
            status: "active",
            nextRun: nextRun?.toISOString() ?? null,
            lastRunStatus: null,
          });

          return {
            content: [
              {
                type: "text" as const,
                text: `Scheduled task created: "${title}" (${scheduleType}: ${scheduleValue}), assigned to ${assigneeAgent.name}`,
              },
            ],
          };
        }
      ),
      tool(
        "list_scheduled_tasks",
        "List all scheduled tasks with status and next run time",
        {},
        async () => {
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          const tasks = await prisma.scheduledTask.findMany({
            where: { projectId: ctx.projectId },
            include: { assignee: true },
            orderBy: { createdAt: "desc" },
          });

          if (!tasks.length) {
            return {
              content: [
                { type: "text" as const, text: "No scheduled tasks." },
              ],
            };
          }

          const summary = tasks
            .map(
              (t) =>
                `[${t.status.toUpperCase()}] ${t.title} — ${t.scheduleType}: ${t.scheduleValue} → ${t.assignee.name}${t.nextRun ? ` (next: ${t.nextRun.toISOString()})` : ""}`
            )
            .join("\n");

          return { content: [{ type: "text" as const, text: summary }] };
        }
      ),
    ],
  });
}

// ─── Developer Tools ──────────────────────────────────────────────────────────

export function createDevToolServer(agentId: string) {
  return createSdkMcpServer({
    name: "dev-tools",
    version: "1.0.0",
    tools: [
      tool(
        "update_task",
        'Update a task status. Moving to "review" triggers the code reviewer.',
        {
          taskId: z.string().describe("Task ID"),
          status: z
            .enum(["todo", "in_progress", "review", "done"])
            .describe("New status"),
          description: z
            .string()
            .optional()
            .describe("Updated description"),
        },
        async (args) => {
          const { taskId, status, description } = args;
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          const task = await prisma.task.update({
            where: { id: taskId },
            data: {
              status,
              ...(description !== undefined && { description }),
            },
            include: { assignee: true, createdBy: true },
          });

          emitToProject(ctx.projectId, "task.updated", task as any);

          // When moved to review, trigger the reviewer
          if (status === "review" && ctx.depth < 10) {
            const reviewerAgent = await prisma.agent.findFirst({
              where: { projectId: ctx.projectId, role: "reviewer" },
            });
            const reviewChannel = await prisma.channel.findFirst({
              where: { projectId: ctx.projectId, name: "code-review" },
            });

            if (reviewerAgent && reviewChannel) {
              queueTrigger(agentId, {
                targetRole: "reviewer",
                channelId: reviewChannel.id,
                message: `Task ready for review: "${task.title}"${task.description ? `\n\n${task.description}` : ""}`,
                depth: ctx.depth + 1,
                source: `${ctx.agentRole}:update_task`,
              });
            }
          }

          return {
            content: [
              {
                type: "text" as const,
                text: `Task "${task.title}" → ${status}`,
              },
            ],
          };
        }
      ),
      tool(
        "list_tasks",
        "List all tasks in the project",
        {},
        async () => {
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          const tasks = await prisma.task.findMany({
            where: { projectId: ctx.projectId },
            include: { assignee: true },
            orderBy: { createdAt: "desc" },
            take: 20,
          });

          const summary = tasks
            .map(
              (t) =>
                `[${t.status}] ${t.title}${t.assignee ? ` → ${t.assignee.name}` : ""} (id: ${t.id})`
            )
            .join("\n");

          return {
            content: [
              {
                type: "text" as const,
                text: summary || "No tasks.",
              },
            ],
          };
        }
      ),
    ],
  });
}

// ─── Reviewer Tools ───────────────────────────────────────────────────────────

export function createReviewerToolServer(agentId: string) {
  return createSdkMcpServer({
    name: "reviewer-tools",
    version: "1.0.0",
    tools: [
      tool(
        "approve_task",
        "Approve a task — moves it to Done",
        {
          taskId: z.string().describe("Task ID to approve"),
          comment: z.string().optional().describe("Optional approval note"),
        },
        async (args) => {
          const { taskId, comment } = args;
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          const task = await prisma.task.update({
            where: { id: taskId },
            data: { status: "done" },
            include: { assignee: true, createdBy: true },
          });

          emitToProject(ctx.projectId, "task.updated", task as any);

          // Trigger PM to track completion
          if (ctx.depth < 10) {
            const pmAgent = await prisma.agent.findFirst({
              where: { projectId: ctx.projectId, role: "pm" },
            });
            const tasksChannel = await prisma.channel.findFirst({
              where: { projectId: ctx.projectId, name: "tasks" },
            });
            if (pmAgent && tasksChannel) {
              queueTrigger(agentId, {
                targetRole: "pm",
                channelId: tasksChannel.id,
                message: `Task approved and completed: "${task.title}"${comment ? `\n\nReviewer note: ${comment}` : ""}`,
                depth: ctx.depth + 1,
                source: `reviewer:approve_task`,
              });
            }
          }

          return {
            content: [
              {
                type: "text" as const,
                text: `Task "${task.title}" approved ✅${comment ? ` — ${comment}` : ""}`,
              },
            ],
          };
        }
      ),
      tool(
        "reject_task",
        "Reject a task — moves it back to In Progress with feedback",
        {
          taskId: z.string().describe("Task ID to reject"),
          reason: z
            .string()
            .describe("Specific feedback on what needs to be fixed"),
        },
        async (args) => {
          const { taskId, reason } = args;
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          const task = await prisma.task.update({
            where: { id: taskId },
            data: { status: "in_progress" },
            include: { assignee: true, createdBy: true },
          });

          emitToProject(ctx.projectId, "task.updated", task as any);

          // Trigger assigned developer with rejection reason in their work channel
          if (task.assignee && ctx.depth < 10) {
            const workChannelName = getWorkChannel(parseJsonArray(task.assignee.channels));
            const devChannel = await prisma.channel.findFirst({
              where: { projectId: ctx.projectId, name: workChannelName },
            });
            if (devChannel) {
              queueTrigger(agentId, {
                targetAgentId: task.assignee.id,
                targetRole: task.assignee.role,
                channelId: devChannel.id,
                message: `Your task "${task.title}" was rejected by the reviewer.\n\nFeedback: ${reason}\n\nPlease address this and move the task back to review when fixed.`,
                depth: ctx.depth + 1,
                source: `reviewer:reject_task`,
              });
            }
          }

          return {
            content: [
              {
                type: "text" as const,
                text: `Task "${task.title}" rejected ❌ — ${reason}`,
              },
            ],
          };
        }
      ),
      tool(
        "list_tasks",
        "List all tasks pending review",
        {},
        async () => {
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          const tasks = await prisma.task.findMany({
            where: { projectId: ctx.projectId },
            include: { assignee: true },
            orderBy: { updatedAt: "desc" },
            take: 20,
          });

          const summary = tasks
            .map(
              (t) =>
                `[${t.status}] ${t.title}${t.assignee ? ` (${t.assignee.name})` : ""} — id: ${t.id}`
            )
            .join("\n");

          return {
            content: [
              { type: "text" as const, text: summary || "No tasks." },
            ],
          };
        }
      ),
    ],
  });
}

// ─── Common Tools (all agents) ───────────────────────────────────────────────

export function createCommonToolServer(agentId: string) {
  return createSdkMcpServer({
    name: "common-tools",
    version: "1.0.0",
    tools: [
      tool(
        "send_message",
        "Post a message to any channel in the project",
        {
          channelName: z.string().describe("Target channel name"),
          content: z.string().describe("Message content"),
        },
        async (args) => {
          const { channelName, content } = args;
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          const channel = await prisma.channel.findFirst({
            where: { projectId: ctx.projectId, name: channelName },
          });
          if (!channel) throw new Error(`Channel not found: ${channelName}`);

          const message = await prisma.message.create({
            data: {
              channelId: channel.id,
              role: "assistant",
              agentId: ctx.agentId,
              content,
              metadata: { crossPost: true },
            },
            include: { agent: true },
          });

          emitToChannel(channel.id, "message.new", message as any);

          return {
            content: [
              {
                type: "text" as const,
                text: `Message posted to #${channelName}`,
              },
            ],
          };
        }
      ),
      tool(
        "list_channels",
        "List all channels in the project",
        {},
        async () => {
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          const channels = await prisma.channel.findMany({
            where: { projectId: ctx.projectId },
          });

          const list = channels
            .map(
              (c) =>
                `#${c.name}${c.description ? ` — ${c.description}` : ""}`
            )
            .join("\n");

          return {
            content: [{ type: "text" as const, text: list }],
          };
        }
      ),
      tool(
        "memory_save",
        "Save a persistent memory note. Survives sessions, crashes, and restarts.",
        {
          key: z
            .string()
            .describe("Short label (e.g., user-preference-css)"),
          content: z.string().describe("Full content of the memory note"),
        },
        async (args) => {
          const { key, content } = args;
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          await prisma.agentMemory.upsert({
            where: { agentId_key: { agentId: ctx.agentId, key } },
            create: {
              projectId: ctx.projectId,
              agentId: ctx.agentId,
              key,
              content,
            },
            update: { content },
          });

          return {
            content: [
              { type: "text" as const, text: `Memory saved: "${key}"` },
            ],
          };
        }
      ),
      tool(
        "memory_search",
        "Search persistent memory by keyword",
        {
          query: z.string().describe("Search keywords"),
        },
        async (args) => {
          const { query } = args;
          const ctx = getExecutionContext(agentId);
          if (!ctx) throw new Error("No execution context");

          const memories = await prisma.agentMemory.findMany({
            where: {
              projectId: ctx.projectId,
              OR: [
                { key: { contains: query, mode: "insensitive" } },
                { content: { contains: query, mode: "insensitive" } },
              ],
            },
            include: { agent: true },
            take: 5,
          });

          if (!memories.length) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "No relevant memories found.",
                },
              ],
            };
          }

          const result = memories
            .map((m) => `[${m.agent.name}] ${m.key}: ${m.content}`)
            .join("\n\n");

          return {
            content: [{ type: "text" as const, text: result }],
          };
        }
      ),
    ],
  });
}

// ─── Factory ──────────────────────────────────────────────────────────────────

const SERVER_FACTORIES: Record<
  string,
  (agentId: string) => ReturnType<typeof createSdkMcpServer>
> = {
  "common-tools": createCommonToolServer,
  "pm-tools": createPmToolServer,
  "dev-tools": createDevToolServer,
  "reviewer-tools": createReviewerToolServer,
};

export function createMcpServersForAgent(
  agentId: string,
  mcpServerNames: string[]
): Record<string, ReturnType<typeof createSdkMcpServer>> {
  const servers: Record<string, ReturnType<typeof createSdkMcpServer>> = {};

  for (const name of mcpServerNames) {
    const factory = SERVER_FACTORIES[name];
    if (factory) {
      servers[name] = factory(agentId);
    }
  }

  return servers;
}
