import { prisma } from "../db/client.js";
import {
  DEFAULT_MESSAGE_HISTORY_LIMIT,
  DEFAULT_TASK_HISTORY_LIMIT,
  DEFAULT_MEMORY_SEARCH_LIMIT,
} from "@devteam/shared";

interface BuildContextOptions {
  projectId: string;
  agentId: string;
  channelId: string;
  currentMessage: string;
  scheduledContext?: {
    taskTitle: string;
    scheduleType: string;
    scheduleValue: string;
  };
}

export async function buildAgentContext(
  opts: BuildContextOptions
): Promise<string> {
  const { projectId, agentId, channelId, currentMessage, scheduledContext } =
    opts;

  const [project, channel, tasks, messages, memories] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
    prisma.channel.findUniqueOrThrow({ where: { id: channelId } }),
    prisma.task.findMany({
      where: { projectId },
      include: { assignee: true, createdBy: true },
      orderBy: { updatedAt: "desc" },
      take: DEFAULT_TASK_HISTORY_LIMIT,
    }),
    prisma.message.findMany({
      where: { channelId },
      include: { agent: true },
      orderBy: { createdAt: "asc" },
      take: DEFAULT_MESSAGE_HISTORY_LIMIT,
    }),
    prisma.agentMemory.findMany({
      where: {
        projectId,
        OR: [
          { key: { contains: currentMessage.slice(0, 50) } },
          { content: { contains: currentMessage.slice(0, 50) } },
        ],
      },
      include: { agent: true },
      take: DEFAULT_MEMORY_SEARCH_LIMIT,
    }),
  ]);

  const lines: string[] = [];

  // Project info
  lines.push(`## Project: ${project.name}`);
  if (project.description) {
    lines.push(`Description: ${project.description}`);
  }
  lines.push(`Channel: #${channel.name}`);
  if (channel.description) {
    lines.push(`Channel purpose: ${channel.description}`);
  }
  lines.push(`Interaction Mode: ${project.interactionMode}`);
  lines.push("");

  // Scheduled context
  if (scheduledContext) {
    lines.push(
      `## Scheduled Task: "${scheduledContext.taskTitle}"`,
      `Schedule: ${scheduledContext.scheduleType} — ${scheduledContext.scheduleValue}`,
      `This is an autonomous scheduled execution. No user is watching in real time.`,
      ""
    );
  }

  // Task board
  if (tasks.length > 0) {
    lines.push("## Current Tasks");
    for (const t of tasks) {
      lines.push(
        `- [${t.status}] ${t.title}${t.assignee ? ` → ${t.assignee.name}` : ""}${t.description ? ` — ${t.description}` : ""} (id: ${t.id})`
      );
    }
    lines.push("");
  }

  // Relevant memories
  if (memories.length > 0) {
    lines.push("## Relevant Memories");
    for (const m of memories) {
      lines.push(`- [${m.agent.name}] **${m.key}**: ${m.content}`);
    }
    lines.push("");
  }

  // Message history
  if (messages.length > 0) {
    lines.push("## Recent Conversation");
    for (const m of messages) {
      const sender =
        m.role === "user" ? "User" : m.agent?.name ?? "Assistant";
      lines.push(`**${sender}**: ${m.content}`);
    }
    lines.push("");
  }

  // Current message
  lines.push("## Current Message");
  lines.push(currentMessage);

  return lines.join("\n");
}
