import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { subjectsTable } from "@workspace/db";
import { eq, asc, and, inArray } from "drizzle-orm";
import { authenticateAny, authenticateStaff, type AuthenticatedRequest } from "../middlewares/authenticate";

const router = Router();

const SubjectBody = z.object({
  title: z.string().min(1),
  titleAr: z.string().min(1),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  gradeLevel: z.string().min(1),
  accessLevel: z.enum(["free", "paid"]).default("free"),
  orderIndex: z.number().int().default(0),
});

router.get("/subjects", authenticateAny, async (req: AuthenticatedRequest, res) => {
  const { gradeLevel } = req.query as Record<string, string>;

  if (req.staff?.staffRole === "teacher") {
    const assignedIds = req.staff.assignedSubjectIds ?? [];
    if (assignedIds.length === 0) { res.json([]); return; }
    const whereClause = gradeLevel
      ? and(eq(subjectsTable.gradeLevel, gradeLevel), inArray(subjectsTable.id, assignedIds))
      : inArray(subjectsTable.id, assignedIds);
    const subjects = await db.select().from(subjectsTable)
      .where(whereClause)
      .orderBy(asc(subjectsTable.orderIndex), asc(subjectsTable.createdAt));
    res.json(subjects);
    return;
  }

  const subjects = await db.select().from(subjectsTable)
    .where(gradeLevel ? eq(subjectsTable.gradeLevel, gradeLevel) : undefined)
    .orderBy(asc(subjectsTable.orderIndex), asc(subjectsTable.createdAt));
  res.json(subjects);
});

router.post("/subjects", authenticateStaff, async (req, res) => {
  const parsed = SubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  const [subject] = await db.insert(subjectsTable).values(parsed.data).returning();
  res.status(201).json(subject);
});

router.put("/subjects/:id", authenticateStaff, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "bad_request" }); return; }
  const parsed = SubjectBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error", message: parsed.error.message }); return; }
  const [subject] = await db.update(subjectsTable).set(parsed.data).where(eq(subjectsTable.id, id)).returning();
  if (!subject) { res.status(404).json({ error: "not_found" }); return; }
  res.json(subject);
});

router.delete("/subjects/:id", authenticateStaff, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "bad_request" }); return; }
  await db.delete(subjectsTable).where(eq(subjectsTable.id, id));
  res.status(204).end();
});

export default router;
