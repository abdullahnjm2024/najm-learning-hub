import { Router } from "express";
import { db } from "@workspace/db";
import {
  lessonsTable, lessonProgressTable, unitsTable, subjectsTable,
  examAttemptsTable, milestonesTable, pushSubscriptionsTable,
} from "@workspace/db";
import { eq, and, asc, inArray } from "drizzle-orm";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import webpush from "web-push";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendPushToStudent(userId: number, title: string, body: string, link: string) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  try {
    const subs = await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, userId));
    const payload = JSON.stringify({ title, body, icon: "/najm-logo.png", data: { link } });
    await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } },
          payload
        ).catch(async (err: any) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
          }
        })
      )
    );
  } catch { }
}

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

  let progress: any;
  let alreadyCompleted = false;

  if (existing.length > 0) {
    if (existing[0].isCompleted) {
      alreadyCompleted = true;
      progress = existing[0];
    } else {
      const [updated] = await db.update(lessonProgressTable)
        .set({ isCompleted: true, completedAt: new Date() })
        .where(and(eq(lessonProgressTable.userId, userId), eq(lessonProgressTable.lessonId, lessonId)))
        .returning();
      progress = updated;
    }
  } else {
    const [created] = await db.insert(lessonProgressTable)
      .values({ userId, lessonId, isCompleted: true, completedAt: new Date() })
      .returning();
    progress = created;
  }

  const newMilestones: any[] = [];

  if (!alreadyCompleted && lesson.unitId) {
    try {
      const unitId = lesson.unitId;

      const unitLessons = await db.select().from(lessonsTable)
        .where(eq(lessonsTable.unitId, unitId));

      const unitLessonIds = unitLessons.map(l => l.id);

      const progressRecords = unitLessonIds.length > 0
        ? await db.select().from(lessonProgressTable)
            .where(and(eq(lessonProgressTable.userId, userId), inArray(lessonProgressTable.lessonId, unitLessonIds)))
        : [];

      const completedSet = new Set(progressRecords.filter(p => p.isCompleted).map(p => p.lessonId));
      const allLessonsDone = unitLessons.every(l => completedSet.has(l.id));

      if (allLessonsDone) {
        const quizLessons = unitLessons.filter(l => l.quizId);
        let allQuizzesPassed = true;
        for (const ql of quizLessons) {
          const attempts = await db.select().from(examAttemptsTable)
            .where(and(eq(examAttemptsTable.examId, ql.quizId!), eq(examAttemptsTable.userId, userId)));
          const passed = attempts.some(a => a.maxScore > 0 && (a.score / a.maxScore) >= 0.70);
          if (!passed) { allQuizzesPassed = false; break; }
        }

        if (allQuizzesPassed) {
          const existingUnit = await db.select().from(milestonesTable)
            .where(and(
              eq(milestonesTable.studentId, userId),
              eq(milestonesTable.type, "unit_complete"),
              eq(milestonesTable.referenceId, unitId)
            )).limit(1);

          if (existingUnit.length === 0) {
            const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, unitId)).limit(1);
            const unitTitle = unit?.titleAr ?? "الوحدة";

            const [unitMilestone] = await db.insert(milestonesTable)
              .values({ studentId: userId, type: "unit_complete", referenceId: unitId, title: unitTitle })
              .returning();

            newMilestones.push(unitMilestone);

            sendPushToStudent(userId, "إنجاز جديد! 🎉", `لقد أتقنت وحدة "${unitTitle}"! تفقد شهادتك الجديدة 📜`, "/profile").catch(() => { });

            if (unit?.subjectId) {
              const subjectId = unit.subjectId;
              const allUnits = await db.select().from(unitsTable).where(eq(unitsTable.subjectId, subjectId));
              const unitIds = allUnits.map(u => u.id);

              const unitMilestones = await db.select().from(milestonesTable)
                .where(and(
                  eq(milestonesTable.studentId, userId),
                  eq(milestonesTable.type, "unit_complete"),
                  inArray(milestonesTable.referenceId, unitIds)
                ));

              const completedUnitIds = new Set(unitMilestones.map(m => m.referenceId));
              const allUnitsDone = allUnits.every(u => completedUnitIds.has(u.id));

              if (allUnitsDone) {
                const existingSubject = await db.select().from(milestonesTable)
                  .where(and(
                    eq(milestonesTable.studentId, userId),
                    eq(milestonesTable.type, "subject_complete"),
                    eq(milestonesTable.referenceId, subjectId)
                  )).limit(1);

                if (existingSubject.length === 0) {
                  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, subjectId)).limit(1);
                  const subjectTitle = subject?.titleAr ?? "المادة";

                  const [subjectMilestone] = await db.insert(milestonesTable)
                    .values({ studentId: userId, type: "subject_complete", referenceId: subjectId, title: subjectTitle })
                    .returning();

                  newMilestones.push(subjectMilestone);

                  sendPushToStudent(userId, "إنجاز عظيم! 🏆", `لقد أتقنت مادة "${subjectTitle}" بالكامل! 🎓`, "/profile").catch(() => { });
                }
              }
            }
          }
        }
      }
    } catch { }
  }

  if (alreadyCompleted) {
    res.json({ alreadyCompleted: true, progress, newMilestones: [] });
  } else if (existing.length > 0) {
    res.json({ progress, newMilestones });
  } else {
    res.status(201).json({ progress, newMilestones });
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
