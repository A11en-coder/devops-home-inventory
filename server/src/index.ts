import express from "express";
import { prisma } from "./db";

const app = express();

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
