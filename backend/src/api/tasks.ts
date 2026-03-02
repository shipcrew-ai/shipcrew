import { Router } from "express";
import { prisma } from "../db/client.js";
import { emitToProject } from "../lib/socket.js";
import { z } from "zod";

export const tasksRouter = Router();

// GET /api/projects/:projectId/tasks
tasksRouter.get("/projects/:projectId/tasks", async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { projectId: req.params.projectId },
    include: { assignee: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(tasks);
});

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).default("todo"),
  assigneeAgentId: z.string().uuid().optional(),
});

// POST /api/projects/:projectId/tasks
tasksRouter.post("/projects/:projectId/tasks", async (req, res) => {
  const parsed = CreateTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

  const task = await prisma.task.create({
    data: { projectId: req.params.projectId, ...parsed.data },
    include: { assignee: true, createdBy: true },
  });

  emitToProject(req.params.projectId, "task.updated", task as any);
  res.status(201).json(task);
});

// PATCH /api/tasks/:id
tasksRouter.patch("/tasks/:id", async (req, res) => {
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: req.body,
    include: { assignee: true, createdBy: true },
  });

  const project = await prisma.project.findFirst({
    where: { tasks: { some: { id: task.id } } },
  });
  if (project) emitToProject(project.id, "task.updated", task as any);

  res.json(task);
});

// DELETE /api/tasks/:id
tasksRouter.delete("/tasks/:id", async (req, res) => {
  await prisma.task.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
