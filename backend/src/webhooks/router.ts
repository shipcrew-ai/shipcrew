import { Router } from "express";
import { prisma } from "../db/client.js";
import { runPipeline } from "../orchestration/pipeline.js";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { toJson } from "../lib/json-fields.js";

export const webhookRouter = Router();

function verifyBearerToken(
  provided: string | undefined,
  expected: string
): boolean {
  if (!provided) return false;
  const token = provided.replace(/^Bearer\s+/i, "");
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function getProjectByAuth(
  authHeader: string | undefined,
  projectId: string
): Promise<{ id: string; webhookToken: string | null } | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, webhookToken: true },
  });
  if (!project) return null;

  const globalToken = process.env.WEBHOOK_SECRET;
  const projectToken = project.webhookToken;

  const validToken = projectToken ?? globalToken;
  if (!validToken) return project; // No auth configured — allow all (dev mode)
  if (!verifyBearerToken(authHeader, validToken)) return null;

  return project;
}

async function checkIdempotency(
  projectId: string,
  key: string | undefined,
  endpoint: string,
  headers: Record<string, string | string[] | undefined>,
  body: unknown,
  responseCode: number,
  status: string
): Promise<boolean> {
  if (!key) return false;

  const existing = await prisma.webhookLog.findUnique({
    where: { idempotencyKey: key },
  });
  if (existing) {
    await prisma.webhookLog.create({
      data: {
        projectId,
        endpoint,
        method: "POST",
        headers: toJson(headers),
        body: toJson(body),
        idempotencyKey: null,
        status: "duplicate",
        responseCode: 200,
      },
    });
    return true;
  }

  await prisma.webhookLog.create({
    data: {
      projectId,
      endpoint,
      method: "POST",
      headers: toJson(headers),
      body: toJson(body),
      idempotencyKey: key,
      status,
      responseCode,
    },
  });
  return false;
}

// POST /hooks/wake — queue a task
const WakeSchema = z.object({
  projectId: z.string().uuid(),
  channelId: z.string().uuid(),
  agentRole: z.string(),
  message: z.string(),
});

webhookRouter.post("/wake", async (req, res) => {
  const parsed = WakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { projectId, channelId, agentRole, message } = parsed.data;

  const project = await getProjectByAuth(
    req.headers.authorization,
    projectId
  );
  if (!project) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idempotencyKey = req.headers["idempotency-key"] as string | undefined;
  const isDuplicate = await checkIdempotency(
    projectId,
    idempotencyKey,
    "/hooks/wake",
    req.headers as any,
    req.body,
    202,
    "accepted"
  );
  if (isDuplicate) {
    return res.status(200).json({ status: "duplicate" });
  }

  // Fire pipeline asynchronously
  runPipeline({
    projectId,
    channelId,
    content: message,
    senderRole: "system",
    executionSource: "webhook",
    metadata: { webhook: true, endpoint: "wake" },
  }).catch((err) => console.error("[Webhook /wake]", err));

  return res.status(202).json({ status: "accepted" });
});

// POST /hooks/agent — fire an agent immediately
const AgentSchema = z.object({
  projectId: z.string().uuid(),
  channelId: z.string().uuid(),
  agentRole: z.string(),
  message: z.string(),
});

webhookRouter.post("/agent", async (req, res) => {
  const parsed = AgentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { projectId, channelId, agentRole, message } = parsed.data;

  const project = await getProjectByAuth(
    req.headers.authorization,
    projectId
  );
  if (!project) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idempotencyKey = req.headers["idempotency-key"] as string | undefined;
  const isDuplicate = await checkIdempotency(
    projectId,
    idempotencyKey,
    "/hooks/agent",
    req.headers as any,
    req.body,
    202,
    "accepted"
  );
  if (isDuplicate) {
    return res.status(200).json({ status: "duplicate" });
  }

  runPipeline({
    projectId,
    channelId,
    content: message,
    senderRole: "system",
    executionSource: "webhook",
    metadata: { webhook: true, endpoint: "agent", targetRole: agentRole },
  }).catch((err) => console.error("[Webhook /agent]", err));

  return res.status(202).json({ status: "accepted" });
});

// POST /hooks/alert — inject a formatted alert
const AlertSchema = z.object({
  projectId: z.string().uuid(),
  channelId: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  severity: z.enum(["info", "warning", "error"]).default("info"),
});

webhookRouter.post("/alert", async (req, res) => {
  const parsed = AlertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }
  const { projectId, channelId, title, body, severity } = parsed.data;

  const project = await getProjectByAuth(
    req.headers.authorization,
    projectId
  );
  if (!project) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const icon =
    severity === "error" ? "🚨" : severity === "warning" ? "⚠️" : "ℹ️";
  const alertContent = `${icon} **${title}**\n\n${body}`;

  runPipeline({
    projectId,
    channelId,
    content: alertContent,
    senderRole: "system",
    executionSource: "webhook",
    metadata: { webhook: true, endpoint: "alert", severity },
  }).catch((err) => console.error("[Webhook /alert]", err));

  return res.status(202).json({ status: "accepted" });
});
