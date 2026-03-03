import "dotenv/config";
import { prisma } from "./client.js";

async function seed() {
  await prisma.$connect();
  console.log("🌱 Database ready. Projects are created per-user via the app.");
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
