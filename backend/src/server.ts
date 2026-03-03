import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import cors from "cors";
import { prisma } from "./db/client.js";
import { setIo } from "./lib/socket.js";
import { runPipeline } from "./orchestration/pipeline.js";
import { startScheduler, stopScheduler, recoverOrphanedTasks } from "./scheduler/index.js";
import { webhookRouter } from "./webhooks/router.js";
import { projectsRouter } from "./api/projects.js";
import { channelsRouter } from "./api/channels.js";
import { tasksRouter } from "./api/tasks.js";
import { scheduledTasksRouter } from "./api/scheduled-tasks.js";
import { agentsRouter } from "./api/agents.js";
import { parseJson } from "./lib/json-fields.js";
import { filesRouter } from "./api/files.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@devteam/shared";

const PORT = parseInt(process.env.PORT ?? "8000", 10);

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }));
app.use(express.json());

// Health check
app.get("/health", async (_req, res) => {
  const db = await prisma.$queryRaw`SELECT 1`.then(() => "ok").catch(() => "error");
  res.json({
    status: "ok",
    db,
    ts: new Date().toISOString(),
  });
});

// REST API
app.use("/api/projects", projectsRouter);
app.use("/api", channelsRouter);
app.use("/api", tasksRouter);
app.use("/api", scheduledTasksRouter);
app.use("/api", agentsRouter);
app.use("/api", filesRouter);

// Webhook endpoints
app.use("/hooks", webhookRouter);

// Webhook logs
app.get("/api/projects/:projectId/webhook-logs", async (req, res) => {
  const { limit = "50", before } = req.query as Record<string, string>;
  const logs = await prisma.webhookLog.findMany({
    where: {
      projectId: req.params.projectId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: parseInt(limit, 10),
  });
  res.json(logs.map((l) => ({ ...l, headers: parseJson(l.headers), body: parseJson(l.body) })));
});

// ─── HTTP + Socket.io ─────────────────────────────────────────────────────────

const httpServer = createServer(app);

const io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(
  httpServer,
  {
    cors: {
      origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  }
);

setIo(io as any);

io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on("channel.join", (payload: { channelId: string }) => {
    socket.join(payload.channelId);
  });

  socket.on("channel.leave", (payload: { channelId: string }) => {
    socket.leave(payload.channelId);
  });

  socket.on("project.join", (payload: { projectId: string }) => {
    socket.join(`project:${payload.projectId}`);
  });

  socket.on("project.leave", (payload: { projectId: string }) => {
    socket.leave(`project:${payload.projectId}`);
  });

  socket.on(
    "message.send",
    async (payload: { channelId: string; content: string; projectId: string }) => {
    const { channelId, content, projectId } = payload;
    try {
      await runPipeline({
        projectId,
        channelId,
        content,
        senderRole: "user",
        executionSource: "user",
        depth: 0,
      });
    } catch (err) {
      console.error("[Socket] message.send error:", err);
    }
    }
  );

  socket.on("disconnect", () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start() {
  // Test DB connection
  await prisma.$connect();
  console.log("[DB] Connected to PostgreSQL");

  // Recover orphaned scheduled tasks from previous crash
  await recoverOrphanedTasks();

  // Start the task scheduler
  startScheduler();

  httpServer.listen(PORT, () => {
    console.log(`[Server] Running at http://localhost:${PORT}`);
    console.log(`[Server] Frontend expected at ${process.env.FRONTEND_URL ?? "http://localhost:3000"}`);
  });
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function shutdown() {
  console.log("[Server] Shutting down...");
  stopScheduler();

  httpServer.close(async () => {
    await prisma.$disconnect();
    console.log("[Server] Shutdown complete");
    process.exit(0);
  });

  // Force exit after 30s
  setTimeout(() => {
    console.error("[Server] Forced shutdown after timeout");
    process.exit(1);
  }, 30_000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});
