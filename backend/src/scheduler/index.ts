import cron from "node-cron";
import { prisma } from "../db/client.js";
import { runPipeline } from "../orchestration/pipeline.js";
import { emitToProject } from "../lib/socket.js";
import {
  SCHEDULER_POLL_INTERVAL_MS,
  SCHEDULER_MAX_CONSECUTIVE_FAILURES,
  SCHEDULER_RETRY_DELAYS_MS,
} from "@devteam/shared";

let schedulerTask: cron.ScheduledTask | null = null;
let isRunning = false;

export function startScheduler(): void {
  if (schedulerTask) return;

  // Poll every 60 seconds
  schedulerTask = cron.schedule("* * * * *", async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await pollDueTasks();
    } catch (err) {
      console.error("[Scheduler] Poll error:", err);
    } finally {
      isRunning = false;
    }
  });

  console.log("[Scheduler] Started — polling every 60s");
}

export function stopScheduler(): void {
  schedulerTask?.stop();
  schedulerTask = null;
  console.log("[Scheduler] Stopped");
}

async function pollDueTasks(): Promise<void> {
  const now = new Date();

  const dueTasks = await prisma.scheduledTask.findMany({
    where: {
      status: "active",
      nextRun: { lte: now },
    },
    include: {
      assignee: true,
      channel: true,
      project: true,
    },
  });

  for (const task of dueTasks) {
    // Mark as running
    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: { status: "running" },
    });

    const startTime = Date.now();

    try {
      await runPipeline({
        projectId: task.projectId,
        channelId: task.channelId,
        content: task.prompt,
        senderRole: "system",
        executionSource: "scheduled",
        depth: 0,
        scheduledContext: {
          taskTitle: task.title,
          scheduleType: task.scheduleType,
          scheduleValue: task.scheduleValue,
        },
        metadata: { scheduled: true, scheduledTaskId: task.id },
      });

      const durationMs = Date.now() - startTime;

      // Log successful run
      await prisma.scheduledTaskRun.create({
        data: {
          scheduledTaskId: task.id,
          status: "success",
          durationMs,
          output: `Completed in ${durationMs}ms`,
        },
      });

      // Compute next run and update status back to active
      const nextRun = computeNextRun(task.scheduleType, task.scheduleValue);
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: {
          status: task.scheduleType === "once" ? "completed" : "active",
          nextRun: nextRun ?? null,
          consecutiveFailures: 0,
        },
      });

      emitToProject(task.projectId, "scheduled.run", {
        scheduledTaskId: task.id,
        status: "success",
        output: `Completed in ${durationMs}ms`,
        durationMs,
      });
      emitToProject(task.projectId, "scheduled.updated", {
        id: task.id,
        projectId: task.projectId,
        title: task.title,
        status: task.scheduleType === "once" ? "completed" : "active",
        nextRun: nextRun?.toISOString() ?? null,
        lastRunStatus: "success",
      });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMsg = (err as Error).message ?? "Unknown error";

      await prisma.scheduledTaskRun.create({
        data: {
          scheduledTaskId: task.id,
          status: "failure",
          durationMs,
          error: errorMsg,
        },
      });

      const newFailures = task.consecutiveFailures + 1;
      const shouldPause = newFailures >= SCHEDULER_MAX_CONSECUTIVE_FAILURES;

      if (shouldPause) {
        // Auto-pause after 3 consecutive failures
        await prisma.scheduledTask.update({
          where: { id: task.id },
          data: { status: "paused", consecutiveFailures: newFailures },
        });

        // Post alert to channel
        await prisma.message.create({
          data: {
            channelId: task.channelId,
            role: "assistant",
            content: `⚠️ Scheduled task "${task.title}" has been paused after ${newFailures} consecutive failures.\n\nLast error: ${errorMsg}\n\nUse \`@Priya resume the ${task.title} task\` to re-activate it.`,
            metadata: { scheduled: true, scheduledTaskId: task.id },
          },
        });
      } else {
        // Retry with exponential backoff
        const retryDelay =
          SCHEDULER_RETRY_DELAYS_MS[newFailures - 1] ??
          SCHEDULER_RETRY_DELAYS_MS[SCHEDULER_RETRY_DELAYS_MS.length - 1];

        await prisma.scheduledTask.update({
          where: { id: task.id },
          data: {
            status: "active",
            nextRun: new Date(Date.now() + retryDelay),
            consecutiveFailures: newFailures,
          },
        });
      }

      emitToProject(task.projectId, "scheduled.run", {
        scheduledTaskId: task.id,
        status: "failure",
        output: errorMsg,
        durationMs,
      });
    }
  }
}

function computeNextRun(
  scheduleType: string,
  scheduleValue: string
): Date | null {
  try {
    if (scheduleType === "once") return null;
    if (scheduleType === "interval") {
      const ms = parseInt(scheduleValue, 10);
      return new Date(Date.now() + ms);
    }
    if (scheduleType === "cron") {
      // Approximate next run as +1 minute for cron
      // In production use a cron-parser library
      return new Date(Date.now() + 60_000);
    }
    return null;
  } catch {
    return null;
  }
}

// Recover orphaned running tasks on startup
export async function recoverOrphanedTasks(): Promise<void> {
  const count = await prisma.scheduledTask.updateMany({
    where: { status: "running" },
    data: { status: "active", nextRun: new Date() },
  });

  if (count.count > 0) {
    console.log(
      `[Scheduler] Recovered ${count.count} orphaned running task(s)`
    );
  }
}
