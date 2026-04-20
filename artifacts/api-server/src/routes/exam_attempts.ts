import { Router } from "express";
import { db } from "@workspace/db";
import { examAttemptsTable, examsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";

const router = Router();

// Manual score submission is DISABLED for all users.
// Scores are recorded exclusively via the backend webhook (/api/webhooks/exam-score).
// This endpoint is kept only so that existing API clients receive a clear error instead of 404.
router.post("/exam-attempts", authenticate, (_req: AuthenticatedRequest, res) => {
  res.status(403).json({
    error: "forbidden",
    message: "تسجيل الدرجات يدوياً غير مسموح. يتم تسجيل النتائج تلقائياً عبر نموذج الاختبار.",
  });
});

// Returns all attempts for the logged-in student, enriched with percentage and exam title.
const buildAttemptsResponse = (attempts: any[], exams: any[]) => {
  const examMap = new Map(exams.map(e => [e.id, e]));
  return attempts.map(a => {
    const pct = a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0;
    const exam = examMap.get(a.examId);
    return {
      ...a,
      percentage: pct,
      passed: pct >= 70,
      examTitle: exam?.titleAr ?? exam?.title ?? null,
    };
  });
};

// GET /api/exam-attempts/my — legacy endpoint, keeps existing clients working
router.get("/exam-attempts/my", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const attempts = await db.select().from(examAttemptsTable)
    .where(eq(examAttemptsTable.userId, user.id))
    .orderBy(desc(examAttemptsTable.createdAt));

  const examIds = [...new Set(attempts.map(a => a.examId))];
  const exams = examIds.length > 0
    ? await db.select({ id: examsTable.id, title: examsTable.title, titleAr: examsTable.titleAr })
        .from(examsTable)
    : [];

  res.json(buildAttemptsResponse(attempts, exams));
});

// GET /api/students/me/attempts — canonical endpoint with percentage and exam metadata
router.get("/students/me/attempts", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const attempts = await db.select().from(examAttemptsTable)
    .where(eq(examAttemptsTable.userId, user.id))
    .orderBy(desc(examAttemptsTable.createdAt));

  const exams = await db.select({ id: examsTable.id, title: examsTable.title, titleAr: examsTable.titleAr })
    .from(examsTable);

  res.json({
    total: attempts.length,
    passed: attempts.filter(a => a.maxScore > 0 && (a.score / a.maxScore) >= 0.70).length,
    attempts: buildAttemptsResponse(attempts, exams),
  });
});

// GET /api/exam-attempts/:examId/best — returns the best attempt for a given exam
router.get("/exam-attempts/:examId/best", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const examId = parseInt(req.params.examId as string);
  if (isNaN(examId)) {
    res.status(400).json({ error: "bad_request", message: "Invalid examId" });
    return;
  }
  const [best] = await db.select().from(examAttemptsTable)
    .where(and(eq(examAttemptsTable.examId, examId), eq(examAttemptsTable.userId, user.id), eq(examAttemptsTable.isBestScore, true)))
    .limit(1);
  if (!best) {
    res.status(404).json({ error: "not_found", message: "No attempt found" });
    return;
  }
  const percentage = best.maxScore > 0 ? Math.round((best.score / best.maxScore) * 100) : 0;
  res.json({ ...best, percentage, passed: percentage >= 70 });
});

export default router;
