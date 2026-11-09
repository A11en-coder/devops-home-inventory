import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is missing");

const target = new URL(connectionString);
if (target.hostname !== "127.0.0.1" || target.port !== "5433" || target.pathname !== "/inventory_dev") {
  throw new Error("This seed is limited to the local inventory_dev database");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const samples = [
  { name: "cookies", quantity: 40, lowStockThreshold: 5 },
  { name: "meat", quantity: 20, lowStockThreshold: 2 },
  { name: "rice", quantity: 100, lowStockThreshold: 30 },
];

try {
  for (const sample of samples) {
    await prisma.item.upsert({
      where: { name: sample.name },
      update: {},
      create: sample,
    });
  }
  console.log("Sample inventory is ready; existing quantities were preserved.");
} finally {
  await prisma.$disconnect();
}
