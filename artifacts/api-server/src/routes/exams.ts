import { Router } from "express";
import { db } from "@workspace/db";
import { examsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticateAny, authenticateStaff, type AuthenticatedRequest } from "../middlewares/authenticate";
import { CreateExamBody } from "@workspace/api-zod";

const router = Router();

router.get("/exams", authenticateAny, async (req: AuthenticatedRequest, res) => {
  const { gradeLevel, accessLevel } = req.query as Record<string, string>;
  const conditions = [];
  if (gradeLevel) conditions.push(eq(examsTable.gradeLevel, gradeLevel));
  if (accessLevel) conditions.push(eq(examsTable.accessLevel, accessLevel));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const exams = await db.select().from(examsTable).where(whereClause).orderBy(desc(examsTable.createdAt));
  res.json(exams);
});

router.post("/exams", authenticateStaff, async (req: AuthenticatedRequest, res) => {
  const parsed = CreateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  const [exam] = await db.insert(examsTable).values(parsed.data).returning();
  res.status(201).json(exam);
});

router.get("/exams/:id", authenticateAny, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "bad_request", message: "Invalid ID" });
    return;
  }
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, id)).limit(1);
  if (!exam) {
    res.status(404).json({ error: "not_found", message: "Exam not found" });
    return;
  }
  res.json(exam);
});

router.put("/exams/:id", authenticateStaff, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "bad_request", message: "Invalid ID" });
    return;
  }
  const parsed = CreateExamBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  const [updated] = await db.update(examsTable).set(parsed.data).where(eq(examsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Exam not found" });
    return;
  }
  res.json(updated);
});

router.delete("/exams/:id", authenticateStaff, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "bad_request", message: "Invalid ID" });
    return;
  }
  await db.delete(examsTable).where(eq(examsTable.id, id));
  res.status(204).end();
});

export default router;
