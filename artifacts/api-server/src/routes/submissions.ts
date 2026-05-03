import { Router } from "express";
import { db } from "@workspace/db";
import { submissionsTable, usersTable, lessonsTable, notificationsTable, userNotificationsTable, pushSubscriptionsTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { authenticate, authenticateStaff, type AuthenticatedRequest, type StaffAuthenticatedRequest } from "../middlewares/authenticate";
import webpush from "web-push";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const router = Router();

async function sendPushToUsers(userIds: number[], title: string, body: string, link?: string) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  try {
    const subs = await db.select().from(pushSubscriptionsTable).where(inArray(pushSubscriptionsTable.userId, userIds));
    const payload = JSON.stringify({ title, body, icon: "/favicon.svg", data: { link } });
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
  } catch { /* push errors are non-fatal */ }
}

router.post("/submissions", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const studentId = req.user!.id;
  const studentName = req.user!.fullName;
  const { lessonId, content } = req.body ?? {};

  if (!lessonId || !content?.trim()) {
    res.status(400).json({ error: "validation_error", message: "lessonId and content are required" });
    return;
  }

  const [submission] = await db.insert(submissionsTable).values({
    studentId,
    lessonId: Number(lessonId),
    content: content.trim(),
  }).returning();

  res.status(201).json(submission);

  // ── Notify admin users in background (non-blocking) ──
  try {
    const [lesson] = await db.select({ titleAr: lessonsTable.titleAr })
      .from(lessonsTable).where(eq(lessonsTable.id, Number(lessonId))).limit(1);

    const lessonTitle = lesson?.titleAr ?? "الدرس";
    const notifLink = "/admin/submissions";

    const [notif] = await db.insert(notificationsTable).values({
      title: "New Student Query",
      titleAr: "استفسار جديد 📝",
      body: `Student ${studentName} sent a new query in lesson ${lessonTitle}`,
      bodyAr: `الطالب ${studentName} أرسل استفساراً جديداً في درس ${lessonTitle}`,
      type: "announcement",
      link: notifLink,
    }).returning();

    const admins = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.accessRole, "admin" as any));

    if (admins.length > 0) {
      await db.insert(userNotificationsTable).values(
        admins.map(a => ({ notificationId: notif.id, userId: a.id, isRead: false }))
      );
      await sendPushToUsers(
        admins.map(a => a.id),
        "استفسار جديد 📝",
        `الطالب ${studentName} أرسل استفساراً في درس ${lessonTitle}`
      );
    }
  } catch (err) {
    console.error("Submission notify-admin error:", err);
  }
});

router.get("/submissions/lesson/:lessonId", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const studentId = req.user!.id;
  const lessonId = parseInt(req.params.lessonId);

  if (isNaN(lessonId)) {
    res.status(400).json({ error: "validation_error", message: "Invalid lessonId" });
    return;
  }

  const submissions = await db
    .select()
    .from(submissionsTable)
    .where(and(eq(submissionsTable.studentId, studentId), eq(submissionsTable.lessonId, lessonId)))
    .orderBy(desc(submissionsTable.createdAt));

  res.json(submissions);
});

router.get("/admin/submissions", authenticateStaff, async (_req: StaffAuthenticatedRequest, res): Promise<void> => {
  const rows = await db
    .select({
      id: submissionsTable.id,
      content: submissionsTable.content,
      adminReply: submissionsTable.adminReply,
      createdAt: submissionsTable.createdAt,
      updatedAt: submissionsTable.updatedAt,
      lessonId: submissionsTable.lessonId,
      studentId: submissionsTable.studentId,
      studentName: usersTable.fullName,
      studentCode: usersTable.studentId,
      gradeLevel: usersTable.gradeLevel,
      lessonTitle: lessonsTable.titleAr,
    })
    .from(submissionsTable)
    .leftJoin(usersTable, eq(submissionsTable.studentId, usersTable.id))
    .leftJoin(lessonsTable, eq(submissionsTable.lessonId, lessonsTable.id))
    .orderBy(desc(submissionsTable.createdAt));

  res.json(rows);
});

router.put("/admin/submissions/:id/reply", authenticateStaff, async (req: StaffAuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { adminReply } = req.body ?? {};

  if (isNaN(id)) {
    res.status(400).json({ error: "validation_error", message: "Invalid submission id" });
    return;
  }

  if (adminReply === undefined) {
    res.status(400).json({ error: "validation_error", message: "adminReply is required" });
    return;
  }

  const [updated] = await db
    .update(submissionsTable)
    .set({ adminReply: adminReply?.trim() || null, updatedAt: new Date() })
    .where(eq(submissionsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Submission not found" });
    return;
  }

  res.json(updated);

  // ── Notify student in background (non-blocking) ──
  try {
    const [lesson] = await db.select({ titleAr: lessonsTable.titleAr })
      .from(lessonsTable).where(eq(lessonsTable.id, updated.lessonId)).limit(1);

    const lessonTitle = lesson?.titleAr ?? "الدرس";
    const notifLink = `/lessons/${updated.lessonId}`;

    const [notif] = await db.insert(notificationsTable).values({
      title: "New Reply from Teacher",
      titleAr: "رد جديد من الأستاذ عبد الله 👨‍🏫",
      body: `Teacher Abdullah replied to your query in lesson ${lessonTitle}`,
      bodyAr: `الأستاذ عبد الله رد على استفسارك في درس ${lessonTitle}`,
      type: "announcement",
      link: notifLink,
    }).returning();

    await db.insert(userNotificationsTable).values({
      notificationId: notif.id,
      userId: updated.studentId,
      isRead: false,
    });

    await sendPushToUsers(
      [updated.studentId],
      "رد جديد من الأستاذ عبد الله 👨‍🏫",
      `الأستاذ عبد الله رد على استفسارك في درس ${lessonTitle}`,
      notifLink
    );
  } catch (err) {
    console.error("Reply notify-student error:", err);
  }
});

export default router;
