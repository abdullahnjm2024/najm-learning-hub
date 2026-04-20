import { Router } from "express";
import { db } from "@workspace/db";
import { siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticateStaff } from "../middlewares/authenticate";

const router = Router();

router.get("/site-settings", async (_req, res) => {
  const settings = await db.select().from(siteSettingsTable);
  const obj: Record<string, string> = {};
  settings.forEach(s => { obj[s.key] = s.value; });
  res.json(obj);
});

router.put("/site-settings/:key", authenticateStaff, async (req, res) => {
  const key = req.params.key as string;
  const { value } = req.body;
  if (typeof value !== "string") { res.status(400).json({ error: "value required" }); return; }
  await db.insert(siteSettingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value, updatedAt: new Date() } });
  res.json({ key, value });
});

export default router;
