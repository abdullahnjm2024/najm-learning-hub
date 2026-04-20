import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { prizesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authenticateStaff } from "../middlewares/authenticate";

const router = Router();

const PrizeBody = z.object({
  name: z.string().min(1).default(""),
  nameAr: z.string().min(1),
  imageUrl: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  requiredStars: z.number().int().default(0),
  orderIndex: z.number().int().default(0),
});

router.get("/prizes", async (_req, res) => {
  const prizes = await db.select().from(prizesTable).orderBy(asc(prizesTable.orderIndex), asc(prizesTable.requiredStars));
  res.json(prizes);
});

router.post("/prizes", authenticateStaff, async (req, res) => {
  const parsed = PrizeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error", message: parsed.error.message }); return; }
  const [prize] = await db.insert(prizesTable).values(parsed.data).returning();
  res.status(201).json(prize);
});

router.put("/prizes/:id", authenticateStaff, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "bad_request" }); return; }
  const parsed = PrizeBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error" }); return; }
  const [prize] = await db.update(prizesTable).set(parsed.data).where(eq(prizesTable.id, id)).returning();
  if (!prize) { res.status(404).json({ error: "not_found" }); return; }
  res.json(prize);
});

router.delete("/prizes/:id", authenticateStaff, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "bad_request" }); return; }
  await db.delete(prizesTable).where(eq(prizesTable.id, id));
  res.status(204).end();
});

export default router;
