import { Router } from "express";
import { db } from "@workspace/db";
import { lessonsTable, lessonProgressTable, unitsTable, examAttemptsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";

const router = Router();

router.post("/progress/lessons/:lessonId", authenticate, async (req: AuthenticatedRequest, res) => {
  const lessonId = parseInt(req.params.lessonId as string);
  const userId = req.user?.id;
  if (isNaN(lessonId) || !userId) { res.status(400).json({ error: "bad_request" }); return; }

  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).limit(1);
  if (!lesson) { res.status(404).json({ error: "not_found" }); return; }

  if (lesson.unitId) {
    const siblings = await db.select().from(lessonsTable)
      .where(eq(lessonsTable.unitId, lesson.unitId))
      .orderBy(asc(lessonsTable.orderIndex), asc(lessonsTable.createdAt));

    const idx = siblings.findIndex(l => l.id === lessonId);
    if (idx > 0) {
      const prevLesson = siblings[idx - 1];
      const [prevProgress] = await db.select().from(lessonProgressTable)
        .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.lessonId, prevLesson.id)))
        .limit(1);
      if (!prevProgress?.isCompleted) {
        res.status(403).json({ error: "locked", message: "يجب إكمال الدرس السابق أولاً" });
        return;
      }
    }
  }

  if (lesson.quizId) {
    const attempts = await db.select().from(examAttemptsTable)
      .where(and(eq(examAttemptsTable.examId, lesson.quizId), eq(examAttemptsTable.userId, userId)));

    const hasPassed = attempts.some(a => a.maxScore > 0 && (a.score / a.maxScore) >= 0.70);
    if (!hasPassed) {
      const bestScore = attempts.length > 0
        ? Math.max(...attempts.map(a => a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0))
        : 0;
      res.status(403).json({
        error: "quiz_required",
        message: `يجب اجتياز اختبار الدرس بنسبة 70% على الأقل. درجتك الحالية: ${bestScore}%`,
        currentScore: bestScore,
      });
      return;
    }
  }

  const existing = await db.select().from(lessonProgressTable)
    .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.lessonId, lessonId)))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].isCompleted) { res.json({ alreadyCompleted: true, progress: existing[0] }); return; }
    const [updated] = await db.update(lessonProgressTable)
      .set({ isCompleted: true, completedAt: new Date() })
      .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.lessonId, lessonId)))
      .returning();
    res.json({ progress: updated });
  } else {
    const [created] = await db.insert(lessonProgressTable)
      .values({ userId, lessonId, isCompleted: true, completedAt: new Date() })
      .returning();
    res.status(201).json({ progress: created });
  }
});

router.get("/progress/subjects/:subjectId", authenticate, async (req: AuthenticatedRequest, res) => {
  const subjectId = parseInt(req.params.subjectId as string);
  const userId = req.user?.id;
  if (isNaN(subjectId) || !userId) { res.status(400).json({ error: "bad_request" }); return; }

  const units = await db.select().from(unitsTable)
    .where(eq(unitsTable.subjectId, subjectId))
    .orderBy(asc(unitsTable.orderIndex));

  const unitIds = units.map(u => u.id);
  if (unitIds.length === 0) { res.json({ completedLessons: 0, totalLessons: 0, units: [] }); return; }

  let allLessonsList: any[] = [];
  for (const unitId of unitIds) {
    const lessons = await db.select().from(lessonsTable)
      .where(eq(lessonsTable.unitId, unitId))
      .orderBy(asc(lessonsTable.orderIndex));
    allLessonsList = [...allLessonsList, ...lessons];
  }

  const lessonIds = allLessonsList.map(l => l.id);
  const progress = lessonIds.length > 0
    ? await db.select().from(lessonProgressTable)
        .where(and(eq(lessonProgressTable.userId, userId)))
    : [];

  const completedIds = new Set(progress.filter(p => p.isCompleted && lessonIds.includes(p.lessonId)).map(p => p.lessonId));

  res.json({
    completedLessons: completedIds.size,
    totalLessons: allLessonsList.length,
    completedLessonIds: Array.from(completedIds),
  });
});

export default router;
