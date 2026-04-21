import { Router } from "express";
import { db } from "@workspace/db";
import { examAttemptsTable, examsTable, usersTable, pushSubscriptionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import webpush from "web-push";

const router = Router();

// Accept either the Replit-stored secret or the plaintext fallback
function isValidWebhookSecret(provided: string | string[] | undefined): boolean {
  if (!provided || Array.isArray(provided)) return false;
  const s = String(provided);
  const primary = process.env.WEBHOOK_SECRET;
  const fallback = process.env.WEBHOOK_SECRET_FALLBACK;
  if (!primary && !fallback) return true;
  if (primary && s === primary) return true;
  if (fallback && s === fallback) return true;
  return false;
}

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

router.post("/webhook/exam-submission", async (req, res) => {
  const secret = req.headers["x-webhook-secret"] || req.query.secret;
  if (!isValidWebhookSecret(secret as string)) {
    res.status(401).json({ error: "unauthorized", message: "Invalid webhook secret" });
    return;
  }

  const { studentId, examId, score, maxScore } = req.body;

  if (!studentId || score === undefined) {
    res.status(400).json({ error: "bad_request", message: "studentId and score are required" });
    return;
  }

  const scoreNum = parseFloat(String(score));
  if (isNaN(scoreNum) || scoreNum < 0) {
    res.status(400).json({ error: "bad_request", message: "score must be a non-negative number" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.studentId, String(studentId))).limit(1);
  if (!user) {
    res.status(404).json({ error: "not_found", message: `Student not found: ${studentId}` });
    return;
  }

  if (examId === undefined) {
    const starsToAdd = Math.round(scoreNum);
    await db.update(usersTable)
      .set({ starsBalance: sql`${usersTable.starsBalance} + ${starsToAdd}` })
      .where(eq(usersTable.id, user.id));

    if (process.env.VAPID_PUBLIC_KEY) {
      const subscriptions = await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, user.id));
      const payload = JSON.stringify({
        title: "نتيجة جديدة! ⭐",
        body: `حصلت على ${starsToAdd} نجمة على إجابتك!`,
        icon: "/favicon.svg",
      });
      await Promise.allSettled(subscriptions.map(sub =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } }, payload)
          .catch(() => db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint)))
      ));
    }

    res.json({ mode: "direct", studentId, starsAwarded: starsToAdd, message: `تمت إضافة ${starsToAdd} نجمة لحساب الطالب` });
    return;
  }
});

// ── تم إيقاف هذا المسار عمداً لمنع تضارب البيانات مع جوجل شيت ──────
router.post("/webhook/update_stars", async (req, res) => {
  res.json({
    success: true,
    message: "تم استلام الطلب وتجاهله بأمان. الاعتماد الآن على نظام أفضل نتيجة (Best Score) الداخلي.",
  });
});

// ── المحاسب الذكي: يعتمد فقط على نظام أفضل نتيجة ─────────────
router.post("/webhooks/exam-score", async (req, res) => {
  const secret = req.headers["x-webhook-secret"] || req.query.secret;
  if (!isValidWebhookSecret(secret as string)) {
    res.status(401).json({ error: "unauthorized", message: "Invalid webhook secret" });
    return;
  }

  const { student_id, quiz_code, score, max_score } = req.body;

  if (!student_id || score === undefined || !quiz_code || max_score === undefined) {
    res.status(400).json({
      error: "bad_request",
      message: "student_id, quiz_code, score, and max_score are required"
    });
    return;
  }

  const scoreNum = parseFloat(String(score));
  const maxScoreNum = parseFloat(String(max_score));

  if (isNaN(scoreNum) || scoreNum < 0 || isNaN(maxScoreNum) || maxScoreNum <= 0) {
    res.status(400).json({ error: "bad_request", message: "Invalid score numbers" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.studentId, String(student_id))).limit(1);
  if (!user) {
    res.status(404).json({ error: "not_found", message: `Student not found: ${student_id}` });
    return;
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.quizCode, String(quiz_code))).limit(1);
  if (!exam) {
    res.status(404).json({
      error: "quiz_code_not_found",
      message: `Quiz code not found in database: "${quiz_code}".`,
      quiz_code: String(quiz_code),
    });
    return;
  }

  const percentage = Math.round((scoreNum / maxScoreNum) * 100);

  const [previousBest] = await db.select().from(examAttemptsTable)
    .where(and(
      eq(examAttemptsTable.examId, exam.id),
      eq(examAttemptsTable.userId, user.id),
      eq(examAttemptsTable.isBestScore, true)
    ))
    .limit(1);

  const prevBestScore = previousBest?.score ?? -1;
  const isNewBest = scoreNum > prevBestScore;

  let starsEarned = 0;
  let starsAwarded = 0;

  if (isNewBest) {
    const ratio = maxScoreNum > 0 ? scoreNum / maxScoreNum : 0;
    starsEarned = Math.round(exam.starsReward * ratio);

    if (previousBest) {
      await db.update(examAttemptsTable)
        .set({ isBestScore: false })
        .where(and(
          eq(examAttemptsTable.examId, exam.id),
          eq(examAttemptsTable.userId, user.id),
          eq(examAttemptsTable.isBestScore, true)
        ));
    }
  }

  await db.insert(examAttemptsTable).values({
    examId: exam.id,
    userId: user.id,
    score: scoreNum,
    maxScore: maxScoreNum,
    isBestScore: isNewBest,
    starsEarned: isNewBest ? starsEarned : 0,
  });

  if (isNewBest) {
    const [starsResult] = await db
      .select({ total: sql<number>`coalesce(sum(${examAttemptsTable.starsEarned}), 0)` })
      .from(examAttemptsTable)
      .where(and(eq(examAttemptsTable.userId, user.id), eq(examAttemptsTable.isBestScore, true)));
      
    starsAwarded = Math.max(0, Number(starsResult?.total ?? 0) - (previousBest?.starsEarned ?? 0));
    
    await db.update(usersTable)
      .set({ starsBalance: Number(starsResult?.total ?? 0) })
      .where(eq(usersTable.id, user.id));
  }

  // ── نظام الإشعارات الذكي الجديد (يعمل مع جميع المحاولات) ─────────────
  if (process.env.VAPID_PUBLIC_KEY) {
    const subscriptions = await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, user.id));
    
    let notifTitle = "";
    let notifBody = "";

    if (isNewBest && starsAwarded > 0) {
      notifTitle = "نتيجة جديدة! 🌟";
      notifBody = `حصلت على نتيجة ممتازة وربحت ${starsAwarded} نجمة في ${exam.titleAr || exam.title}! (الدرجة: ${percentage}%)`;
    } else if (isNewBest) {
      notifTitle = "أفضل نتيجة! 🚀";
      notifBody = `تم تسجيل أفضل نتيجة لك في ${exam.titleAr || exam.title}! (الدرجة: ${percentage}%)`;
    } else {
      // حساب النسبة المئوية للنتيجة القديمة
      const prevBestPct = maxScoreNum > 0 ? Math.round((prevBestScore / maxScoreNum) * 100) : 0;
      notifTitle = "نتيجة المراجعة 📝";
      notifBody = `نتيجتك في هذه المحاولة: ${percentage}%. (لا تقلق، أفضل نتيجة لك محفوظة: ${prevBestPct}%)`;
    }

    const payload = JSON.stringify({
      title: notifTitle,
      body: notifBody,
      icon: "/favicon.svg",
    });

    await Promise.allSettled(subscriptions.map(sub =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } }, payload)
        .catch(() => db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint)))
    ));
  }

  res.json({
    success: true,
    student_id: String(student_id),
    quiz_code: String(quiz_code),
    exam_id: exam.id,
    exam_title: exam.titleAr || exam.title,
    score: scoreNum,
    max_score: maxScoreNum,
    percentage,
    passed: percentage >= 70,
    is_new_best: isNewBest,
    stars_awarded: starsAwarded,
    message: isNewBest
      ? `أفضل نتيجة جديدة! الفارق المضاف: ${starsAwarded} نجمة.`
      : "تم تسجيل الدرجة (نتيجة مراجعة).",
  });
});
// ── باب استقبال وتأسيس الاختبارات من جوجل شيت (معدل) ─────────────
router.post("/webhook/sync-exam", async (req, res) => {
  const secret = req.headers["x-webhook-secret"] || req.query.secret;
  if (!isValidWebhookSecret(secret as string)) {
    res.status(401).json({ error: "unauthorized", message: "Invalid webhook secret" });
    return;
  }

  // 💡 أضفنا maxScore هنا
  const { quizCode, titleAr, googleFormUrl, starsReward, maxScore, gradeLevel } = req.body;

  if (!quizCode || !titleAr) {
    res.status(400).json({ error: "bad_request", message: "quizCode and titleAr are required" });
    return;
  }

  try {
    const [existingExam] = await db.select().from(examsTable).where(eq(examsTable.quizCode, String(quizCode))).limit(1);

    if (existingExam) {
      await db.update(examsTable)
        .set({
          titleAr: titleAr,
          title: titleAr, 
          googleFormUrl: googleFormUrl || existingExam.googleFormUrl,
          starsReward: Number(starsReward) || existingExam.starsReward,
          maxScore: Number(maxScore) || existingExam.maxScore, // 💡 تحديث أعلى درجة
          gradeLevel: gradeLevel || existingExam.gradeLevel
        })
        .where(eq(examsTable.id, existingExam.id));

      res.json({ success: true, message: `تم تحديث الاختبار: ${quizCode}` });
    } else {
      await db.insert(examsTable).values({
        quizCode: String(quizCode),
        titleAr: String(titleAr),
        title: String(titleAr),
        googleFormUrl: googleFormUrl || "",
        starsReward: Number(starsReward) || 10,
        maxScore: Number(maxScore) || 10, // 💡 وضع أعلى درجة
        gradeLevel: gradeLevel || "grade9",
        accessLevel: "free" 
      });

      res.json({ success: true, message: `تم إنشاء الاختبار: ${quizCode}` });
    }
  } catch (error: any) {
    console.error("Error syncing exam:", error);
    res.status(500).json({ error: "server_error", message: error.message });
  }
});
export default router;