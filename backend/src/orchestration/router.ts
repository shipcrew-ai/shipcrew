import { prisma } from "../db/client.js";
import type { RoutedAgent } from "@devteam/shared";

// @all / @team / @everyone routes to all agents
const BROADCAST_MENTIONS = new Set(["all", "team", "everyone"]);

export async function routeMessage(
  projectId: string,
  channelId: string,
  content: string
): Promise<RoutedAgent[]> {
  const agents = await prisma.agent.findMany({
    where: { projectId },
  });

  const channel = await prisma.channel.findUniqueOrThrow({
    where: { id: channelId },
  });

  const routed: RoutedAgent[] = [];
  const addedIds = new Set<string>();

  // Build dynamic mention map from agent mentionNames
  const mentionToAgent = new Map<string, typeof agents[0]>();
  for (const a of agents) {
    if (a.mentionName) {
      mentionToAgent.set(a.mentionName.toLowerCase(), a);
    }
    // Also support matching by lowercase name
    mentionToAgent.set(a.name.toLowerCase(), a);
  }

  // Parse @mentions from content
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(content.toLowerCase())) !== null) {
    mentions.push(match[1]);
  }

  const isBroadcast = mentions.some((m) => BROADCAST_MENTIONS.has(m));

  // 1. Broadcast — route to ALL agents
  if (isBroadcast) {
    for (const agent of agents) {
      if (!addedIds.has(agent.id)) {
        routed.push({
          agentId: agent.id,
          role: agent.role,
          reason: "mentioned",
        });
        addedIds.add(agent.id);
      }
    }
    return routed;
  }

  // 2. Individual @mentions — match by mentionName or name
  for (const name of mentions) {
    const agent = mentionToAgent.get(name);
    if (agent && !addedIds.has(agent.id)) {
      routed.push({
        agentId: agent.id,
        role: agent.role,
        reason: "mentioned",
      });
      addedIds.add(agent.id);
    }
  }

  // 3. If no mentions matched, route by channel membership
  if (routed.length === 0) {
    // Find agents that have this channel in their channels array
    const channelAgents = agents.filter((a) =>
      a.channels.includes(channel.name)
    );

    if (channelAgents.length > 0) {
      // Pick the first agent assigned to this channel
      const agent = channelAgents[0];
      routed.push({
        agentId: agent.id,
        role: agent.role,
        reason: "channel_member",
      });
      addedIds.add(agent.id);
    }
  }

  // 4. Fallback to PM if nothing matched
  if (routed.length === 0) {
    const pm = agents.find((a) => a.role === "pm");
    if (pm) {
      routed.push({
        agentId: pm.id,
        role: "pm",
        reason: "channel_member",
      });
    }
  }

  return routed;
}
