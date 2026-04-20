import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { unitsTable, lessonsTable, lessonProgressTable, examAttemptsTable } from "@workspace/db";
import { eq, asc, and, inArray } from "drizzle-orm";
import { authenticateAny, authenticateStaff, type AuthenticatedRequest } from "../middlewares/authenticate";

const router = Router();

const UnitBody = z.object({
  subjectId: z.number().int(),
  title: z.string().min(1),
  titleAr: z.string().min(1),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  orderIndex: z.number().int().default(0),
});

router.get("/units", authenticateAny, async (req: AuthenticatedRequest, res) => {
  const { subjectId } = req.query as Record<string, string>;
  const units = await db.select().from(unitsTable)
    .where(subjectId ? eq(unitsTable.subjectId, parseInt(subjectId)) : undefined)
    .orderBy(asc(unitsTable.orderIndex), asc(unitsTable.createdAt));
  res.json(units);
});

router.get("/units/:id/lessons", authenticateAny, async (req: AuthenticatedRequest, res) => {
  const unitId = parseInt(req.params.id as string);
  if (isNaN(unitId)) { res.status(400).json({ error: "bad_request" }); return; }
  const userId = req.user?.id;

  const lessons = await db.select().from(lessonsTable)
    .where(eq(lessonsTable.unitId, unitId))
    .orderBy(asc(lessonsTable.orderIndex), asc(lessonsTable.createdAt));

  if (!userId) {
    res.json(lessons.map((l, idx) => ({ ...l, isCompleted: false, isLocked: idx > 0, bestQuizScore: null, quizPassed: false })));
    return;
  }

  const progress = await db.select().from(lessonProgressTable)
    .where(eq(lessonProgressTable.userId, userId));

  const completedIds = new Set(progress.filter(p => p.isCompleted).map(p => p.lessonId));

  const quizIds = lessons.filter(l => l.quizId).map(l => l.quizId as number);
  const quizScoreMap: Record<number, number> = {};
  if (quizIds.length > 0) {
    const attempts = await db.select().from(examAttemptsTable)
      .where(and(eq(examAttemptsTable.userId, userId), inArray(examAttemptsTable.examId, quizIds)));
    for (const attempt of attempts) {
      const pct = attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0;
      if (quizScoreMap[attempt.examId] === undefined || pct > quizScoreMap[attempt.examId]) {
        quizScoreMap[attempt.examId] = pct;
      }
    }
  }

  const lessonsWithStatus = lessons.map((lesson, index) => {
    const isCompleted = completedIds.has(lesson.id);
    const isLocked = index > 0 && !completedIds.has(lessons[index - 1].id);
    const bestQuizScore = lesson.quizId !== null && lesson.quizId !== undefined ? (quizScoreMap[lesson.quizId] ?? null) : null;
    const quizPassed = bestQuizScore !== null && bestQuizScore >= 70;
    return { ...lesson, isCompleted, isLocked, bestQuizScore, quizPassed };
  });

  res.json(lessonsWithStatus);
});

router.post("/units", authenticateStaff, async (req, res) => {
  const parsed = UnitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error", message: parsed.error.message }); return; }
  const [unit] = await db.insert(unitsTable).values(parsed.data).returning();
  res.status(201).json(unit);
});

router.put("/units/:id", authenticateStaff, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "bad_request" }); return; }
  const parsed = UnitBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error", message: parsed.error.message }); return; }
  const [unit] = await db.update(unitsTable).set(parsed.data).where(eq(unitsTable.id, id)).returning();
  if (!unit) { res.status(404).json({ error: "not_found" }); return; }
  res.json(unit);
});

router.delete("/units/:id", authenticateStaff, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "bad_request" }); return; }
  await db.delete(unitsTable).where(eq(unitsTable.id, id));
  res.status(204).end();
});

export default router;
