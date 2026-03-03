import { Router } from "express";
import { prisma } from "../db/client.js";
import { emitToProject } from "../lib/socket.js";
import { generateSystemPrompt } from "../agents/prompts.js";
import type { AgentRecord } from "../agents/config.js";
import { z } from "zod";
import { parseJsonArray, toJsonString } from "../lib/json-fields.js";

export const agentsRouter = Router();

// GET /api/projects/:projectId/agents
agentsRouter.get("/projects/:projectId/agents", async (req, res) => {
  const agents = await prisma.agent.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { createdAt: "asc" },
  });
  res.json(agents.map((a) => ({
    ...a,
    skills: parseJsonArray(a.skills),
    channels: parseJsonArray(a.channels),
  })));
});

// POST /api/projects/:projectId/agents — create custom agent
const CreateAgentSchema = z.object({
  name: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  role: z.string().min(1).max(50),
  avatar: z.string().min(1).max(10),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  mentionName: z
    .string()
    .min(1)
    .max(30)
    .regex(/^[a-z0-9_-]+$/, "mentionName must be lowercase alphanumeric"),
  skills: z.array(z.string()).min(1),
  channels: z.array(z.string()).default(["general"]),
  systemPrompt: z.string().optional(),
  timeoutMs: z.number().int().min(10_000).max(600_000).default(120_000),
  maxTurns: z.number().int().min(1).max(100).default(25),
  maxBudgetUsd: z.number().min(0.1).max(10.0).default(1.0),
});

agentsRouter.post("/projects/:projectId/agents", async (req, res) => {
  const parsed = CreateAgentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const { projectId } = req.params;
  const data = parsed.data;

  // Check mentionName uniqueness
  const existing = await prisma.agent.findFirst({
    where: { projectId, mentionName: data.mentionName },
  });
  if (existing) {
    return res.status(409).json({ error: `mentionName @${data.mentionName} is already taken` });
  }

  const agent = await prisma.agent.create({
    data: {
      projectId,
      role: data.role,
      name: data.name,
      title: data.title,
      avatar: data.avatar,
      color: data.color,
      mentionName: data.mentionName,
      skills: toJsonString(data.skills),
      channels: toJsonString(data.channels),
      systemPrompt: data.systemPrompt ?? null,
      isCustom: true,
      timeoutMs: data.timeoutMs,
      maxTurns: data.maxTurns,
      maxBudgetUsd: data.maxBudgetUsd,
      status: "idle",
    },
  });

  const agentOut = { ...agent, skills: parseJsonArray(agent.skills), channels: parseJsonArray(agent.channels) };
  emitToProject(projectId, "agent.created", agentOut as any);
  res.status(201).json(agentOut);
});

// PATCH /api/projects/:projectId/agents/:agentId — edit agent
const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(100).optional(),
  avatar: z.string().min(1).max(10).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  mentionName: z
    .string()
    .min(1)
    .max(30)
    .regex(/^[a-z0-9_-]+$/)
    .optional(),
  skills: z.array(z.string()).min(1).optional(),
  channels: z.array(z.string()).optional(),
  systemPrompt: z.string().nullable().optional(),
  timeoutMs: z.number().int().min(10_000).max(600_000).optional(),
  maxTurns: z.number().int().min(1).max(100).optional(),
  maxBudgetUsd: z.number().min(0.1).max(10.0).optional(),
});

agentsRouter.patch("/projects/:projectId/agents/:agentId", async (req, res) => {
  const parsed = UpdateAgentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const { projectId, agentId } = req.params;
  const data = parsed.data;

  // Check mentionName uniqueness if changing
  if (data.mentionName) {
    const existing = await prisma.agent.findFirst({
      where: {
        projectId,
        mentionName: data.mentionName,
        NOT: { id: agentId },
      },
    });
    if (existing) {
      return res.status(409).json({ error: `mentionName @${data.mentionName} is already taken` });
    }
  }

  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.avatar !== undefined && { avatar: data.avatar }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.mentionName !== undefined && { mentionName: data.mentionName }),
      ...(data.skills !== undefined && { skills: toJsonString(data.skills) }),
      ...(data.channels !== undefined && { channels: toJsonString(data.channels) }),
      ...(data.systemPrompt !== undefined && { systemPrompt: data.systemPrompt }),
      ...(data.timeoutMs !== undefined && { timeoutMs: data.timeoutMs }),
      ...(data.maxTurns !== undefined && { maxTurns: data.maxTurns }),
      ...(data.maxBudgetUsd !== undefined && { maxBudgetUsd: data.maxBudgetUsd }),
    },
  });

  const agentOut = { ...agent, skills: parseJsonArray(agent.skills), channels: parseJsonArray(agent.channels) };
  emitToProject(projectId, "agent.updated", agentOut as any);
  res.json(agentOut);
});

// DELETE /api/projects/:projectId/agents/:agentId
agentsRouter.delete("/projects/:projectId/agents/:agentId", async (req, res) => {
  const { projectId, agentId } = req.params;

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  if (!agent.isCustom) {
    return res.status(403).json({ error: "Cannot delete default agents" });
  }

  await prisma.agent.delete({ where: { id: agentId } });
  emitToProject(projectId, "agent.deleted", { agentId, projectId });
  res.status(204).send();
});

// GET /api/projects/:projectId/agents/:agentId/generated-prompt — preview without changing anything
agentsRouter.get("/projects/:projectId/agents/:agentId/generated-prompt", async (req, res) => {
  const { projectId, agentId } = req.params;

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  const allAgents = await prisma.agent.findMany({ where: { projectId } });
  const generatedPrompt = generateSystemPrompt(
    agent as unknown as AgentRecord,
    allAgents as unknown as AgentRecord[]
  );

  res.json({ generatedPrompt });
});

// POST /api/projects/:projectId/agents/:agentId/reset-prompt — clear custom prompt, return preview
agentsRouter.post("/projects/:projectId/agents/:agentId/reset-prompt", async (req, res) => {
  const { projectId, agentId } = req.params;

  // Clear custom system prompt — will use auto-generated at runtime
  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: { systemPrompt: null },
  });

  const allAgents = await prisma.agent.findMany({ where: { projectId } });
  const preview = generateSystemPrompt(
    agent as unknown as AgentRecord,
    allAgents as unknown as AgentRecord[]
  );

  const agentOut = { ...agent, skills: parseJsonArray(agent.skills), channels: parseJsonArray(agent.channels) };
  emitToProject(projectId, "agent.updated", agentOut as any);
  res.json({ agent: agentOut, generatedPrompt: preview });
});
