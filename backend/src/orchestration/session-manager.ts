import { prisma } from "../db/client.js";

export async function getStoredSessionId(
  agentId: string
): Promise<string | null> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { sessionId: true },
  });
  return agent?.sessionId ?? null;
}

export async function persistSessionId(
  agentId: string,
  sessionId: string
): Promise<void> {
  await prisma.agent.update({
    where: { id: agentId },
    data: { sessionId },
  });
}

export async function clearSessionId(agentId: string): Promise<void> {
  await prisma.agent.update({
    where: { id: agentId },
    data: { sessionId: null },
  });
}
