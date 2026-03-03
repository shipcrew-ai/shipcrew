import { Router } from "express";
import { prisma } from "../db/client.js";
import { parseJson } from "../lib/json-fields.js";

export const channelsRouter = Router();

// GET /api/projects/:projectId/channels
channelsRouter.get("/projects/:projectId/channels", async (req, res) => {
  const channels = await prisma.channel.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { name: "asc" },
  });
  res.json(channels);
});

// GET /api/channels/:channelId/messages
channelsRouter.get("/channels/:channelId/messages", async (req, res) => {
  const { limit = "50", before } = req.query as Record<string, string>;

  const messages = await prisma.message.findMany({
    where: {
      channelId: req.params.channelId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    include: { agent: true },
    orderBy: { createdAt: "asc" },
    take: parseInt(limit, 10),
  });

  res.json(messages.map((m) => ({ ...m, metadata: parseJson(m.metadata) })));
});
