import express from "express";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "./db";

const app = express();
app.use(express.json({ limit: "16kb" }));

app.get("/items", async (_request, response) => {
  try {
    const items = await prisma.item.findMany({
      orderBy: { name: "asc" },
    });
    response.json(items);
  } catch (error) {
    const type = error instanceof Error ? error.name : "UnknownError";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : undefined;
    console.error("GET /items failed", { type, code });
    response.status(503).json({ error: "Inventory is temporarily unavailable" });
  }
});

app.post("/items", async (request, response) => {
  const body: unknown = request.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    response.status(400).json({ error: "Send an item as JSON" });
    return;
  }

  const { name, quantity, lowStockThreshold } = body as Record<string, unknown>;
  const cleanName = typeof name === "string" ? name.trim() : "";
  const validCount = (value: unknown): value is number =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 2_147_483_647;

  if (!cleanName || !validCount(quantity) || !validCount(lowStockThreshold)) {
    response.status(400).json({
      error: "Name must not be blank; quantity and threshold must be nonnegative whole numbers",
    });
    return;
  }

  try {
    const item = await prisma.item.create({
      data: { name: cleanName, quantity, lowStockThreshold },
    });
    response.status(201).json(item);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      response.status(409).json({ error: "An item with that name already exists" });
      return;
    }

    const type = error instanceof Error ? error.name : "UnknownError";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : undefined;
    console.error("POST /items failed", { type, code });
    response.status(503).json({ error: "Inventory is temporarily unavailable" });
  }
});
app.post("/items/:id/use-one", async (request, response) => {
  const id = request.params.id;

  try {
    const [updatedItem] = await prisma.item.updateManyAndReturn({
      where: { id, quantity: { gt: 0 } },
      data: { quantity: { decrement: 1 } },
    });

    if (updatedItem) {
      response.json(updatedItem);
      return;
    }

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      response.status(404).json({ error: "Item not found" });
      return;
    }

    response.status(409).json({ error: "Out of stock" });
  } catch (error) {
    const type = error instanceof Error ? error.name : "UnknownError";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : undefined;
    console.error("POST /items/:id/use-one failed", { type, code });
    response.status(503).json({ error: "Inventory is temporarily unavailable" });
  }
});
app.listen(3000, "127.0.0.1", () => {
  console.info("Inventory API listening on http://127.0.0.1:3000");
});
