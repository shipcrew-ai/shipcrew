import type { AgentSkill } from "@devteam/shared";
import { SKILL_DEFINITIONS } from "@devteam/shared";
import { SYSTEM_PROMPTS, generateSystemPrompt } from "./prompts.js";
import { parseJsonArray } from "../lib/json-fields.js";

export interface AgentConfig {
  role: string;
  name: string;
  title: string;
  avatar: string;
  color: string;
  systemPrompt: string;
  allowedTools: string[];
  mcpServerNames: string[];
  channels: string[];
  timeoutMs: number;
  maxTurns: number;
  maxBudgetUsd: number;
}

// DB agent shape (subset of Prisma Agent)
export interface AgentRecord {
  id: string;
  projectId: string;
  role: string;
  name: string;
  title: string;
  avatar: string;
  color: string;
  isCustom: boolean;
  systemPrompt: string | null;
  skills: string[];
  channels: string[];
  mentionName: string | null;
  timeoutMs: number;
  maxTurns: number;
  maxBudgetUsd: number;
}

/**
 * Build a dynamic agent config from the DB record + all project agents.
 * Replaces the old static AGENT_CONFIGS[role] lookup.
 */
export function buildAgentConfigFromDb(
  agent: AgentRecord,
  projectAgents: AgentRecord[]
): AgentConfig {
  const skills = parseJsonArray(agent.skills as unknown as string) as AgentSkill[];

  // Collect SDK tools from skills (deduplicated)
  const sdkToolSet = new Set<string>();
  const mcpServerSet = new Set<string>();

  for (const skill of skills) {
    const def = SKILL_DEFINITIONS[skill];
    if (!def) continue;
    for (const t of def.sdkTools) sdkToolSet.add(t);
    for (const s of def.mcpServers) mcpServerSet.add(s);
  }

  // Always include common-tools for communication/memory
  mcpServerSet.add("common-tools");

  const mcpServerNames = Array.from(mcpServerSet);

  // Build allowedTools: SDK tools + MCP tool wildcards
  const allowedTools = [
    ...Array.from(sdkToolSet),
    ...mcpServerNames.map((s) => `mcp__${s}__*`),
  ];

  // Determine system prompt
  let systemPrompt: string;
  if (agent.systemPrompt) {
    // User-customized prompt
    systemPrompt = agent.systemPrompt;
  } else if (!agent.isCustom && SYSTEM_PROMPTS[agent.role]) {
    // Default agent with handcrafted prompt — use it, but regenerate
    // team roster dynamically
    systemPrompt = generateSystemPrompt(agent, projectAgents);
  } else {
    // Custom agent or unknown role — auto-generate
    systemPrompt = generateSystemPrompt(agent, projectAgents);
  }

  return {
    role: agent.role,
    name: agent.name,
    title: agent.title,
    avatar: agent.avatar,
    color: agent.color,
    systemPrompt,
    allowedTools,
    mcpServerNames,
    channels: parseJsonArray(agent.channels as unknown as string),
    timeoutMs: agent.timeoutMs,
    maxTurns: agent.maxTurns,
    maxBudgetUsd: agent.maxBudgetUsd,
  };
}
