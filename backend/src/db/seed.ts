import "dotenv/config";
import { prisma } from "./client.js";
import {
  AGENT_DEFINITIONS,
  ALL_ROLES,
  CHANNEL_DEFINITIONS,
  ALL_CHANNELS,
} from "@devteam/shared";
import { provisionSandbox } from "../lib/sandbox.js";
import { toJsonString } from "../lib/json-fields.js";

async function seed() {
  console.log("🌱 Seeding default project...");

  // Check if default project already exists
  const existing = await prisma.project.findFirst({
    where: { name: "My First Project" },
  });
  if (existing) {
    console.log("✅ Default project already exists, skipping seed.");
    return;
  }

  const sandboxPath = await provisionSandbox("my-first-project");

  const project = await prisma.project.create({
    data: {
      name: "My First Project",
      description: "Get started by typing a message in #general",
      sandboxPath,
    },
  });

  // Create agents
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
        status: "idle",
      },
    });
  }

  // Create channels
  for (const name of ALL_CHANNELS) {
    const def = CHANNEL_DEFINITIONS[name];
    await prisma.channel.create({
      data: {
        projectId: project.id,
        name,
        description: def.description,
      },
    });
  }

  console.log(`✅ Created project "${project.name}" (id: ${project.id})`);
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
