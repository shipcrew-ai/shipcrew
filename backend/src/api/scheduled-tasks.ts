import { Router } from "express";
import { prisma } from "../db/client.js";
import { emitToProject } from "../lib/socket.js";

export const scheduledTasksRouter = Router();

// GET /api/projects/:projectId/scheduled-tasks
scheduledTasksRouter.get(
  "/projects/:projectId/scheduled-tasks",
  async (req, res) => {
    const tasks = await prisma.scheduledTask.findMany({
      where: { projectId: req.params.projectId },
      include: {
        assignee: true,
        runs: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(tasks);
  }
);

// PATCH /api/scheduled-tasks/:id
scheduledTasksRouter.patch("/scheduled-tasks/:id", async (req, res) => {
  const task = await prisma.scheduledTask.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(task);
});

// DELETE /api/scheduled-tasks/:id
scheduledTasksRouter.delete("/scheduled-tasks/:id", async (req, res) => {
  await prisma.scheduledTask.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// GET /api/scheduled-tasks/:id/runs
scheduledTasksRouter.get("/scheduled-tasks/:id/runs", async (req, res) => {
  const runs = await prisma.scheduledTaskRun.findMany({
    where: { scheduledTaskId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json(runs);
});
