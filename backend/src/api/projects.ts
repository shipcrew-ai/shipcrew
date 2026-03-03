import { Router } from "express";
import { prisma } from "../db/client.js";
import { provisionSandbox, destroySandbox } from "../lib/sandbox.js";
import {
  AGENT_DEFINITIONS,
  ALL_ROLES,
  CHANNEL_DEFINITIONS,
  ALL_CHANNELS,
} from "@devteam/shared";
import { z } from "zod";
import crypto from "crypto";
import { toJsonString } from "../lib/json-fields.js";

export const projectsRouter = Router();

// GET /api/projects
projectsRouter.get("/", async (_req, res) => {
  const projects = await prisma.project.findMany({
    include: { agents: true, channels: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(projects);
});

// GET /api/projects/:id
projectsRouter.get("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: { agents: true, channels: true },
  });
  if (!project) return res.status(404).json({ error: "Not found" });
  res.json(project);
});

// POST /api/projects
const CreateProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

projectsRouter.post("/", async (req, res) => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const { name, description } = parsed.data;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || `project-${Date.now()}`;
  const sandboxPath = await provisionSandbox(slug);

  const project = await prisma.project.create({
    data: { name, description, sandboxPath },
  });

  // Provision agents with full skill/channel/mention data
  for (const role of ALL_ROLES) {
    const def = AGENT_DEFINITIONS[role];
    await prisma.agent.create({
      data: {
        projectId: project.id,
        role,
        name: def.name,
        title: def.title,
        avatar: def.avatar,
        color: def.color,
        mentionName: def.mentionName,
        skills: toJsonString(def.skills),
        channels: toJsonString(def.channels),
        timeoutMs: def.timeoutMs,
        maxTurns: def.maxTurns,
        maxBudgetUsd: def.maxBudgetUsd,
        isCustom: false,
        status: "idle",
      },
    });
  }

  // Provision channels
  for (const name of ALL_CHANNELS) {
    const def = CHANNEL_DEFINITIONS[name];
    await prisma.channel.create({
      data: { projectId: project.id, name, description: def.description },
    });
  }

  const full = await prisma.project.findUniqueOrThrow({
    where: { id: project.id },
    include: { agents: true, channels: true },
  });

  res.status(201).json(full);
});

// DELETE /api/projects/:id
projectsRouter.delete("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
  });
  if (!project) return res.status(404).json({ error: "Not found" });

  await destroySandbox(project.sandboxPath);
  await prisma.project.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// PATCH /api/projects/:id/interaction-mode
projectsRouter.patch("/:id/interaction-mode", async (req, res) => {
  const mode = req.body.mode;
  if (mode !== "newbie" && mode !== "advanced") {
    return res.status(400).json({ error: "mode must be 'newbie' or 'advanced'" });
  }
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { interactionMode: mode },
    include: { agents: true, channels: true },
  });
  res.json(project);
});

// PATCH /api/projects/:id/notifications
projectsRouter.patch("/:id/notifications", async (req, res) => {
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { notificationConfig: req.body },
  });
  res.json(project);
});

// POST /api/projects/:id/webhook-token
projectsRouter.post("/:id/webhook-token", async (req, res) => {
  const token = crypto.randomBytes(32).toString("hex");
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { webhookToken: token },
  });
  res.json({ token });
});
