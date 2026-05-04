import { Router } from "express";
import { db } from "@workspace/db";
import {
  submissionsTable, usersTable, lessonsTable,
  pushSubscriptionsTable, staffPushSubscriptionsTable, staffTable,
} from "@workspace/db";
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

async function firePush(endpoint: string, p256dhKey: string, authKey: string, payload: string) {
  return webpush.sendNotification(
    { endpoint, keys: { p256dh: p256dhKey, auth: authKey } },
    payload
  );
}

async function pushToStaff(roles: ("teacher" | "supervisor" | "super_admin")[], title: string, body: string, url: string) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  try {
    const staffRows = await db.select({ id: staffTable.id })
      .from(staffTable)
      .where(inArray(staffTable.role, roles));
    if (staffRows.length === 0) return;

    const staffIds = staffRows.map(s => s.id);
    const subs = await db.select().from(staffPushSubscriptionsTable)
      .where(inArray(staffPushSubscriptionsTable.staffId, staffIds));
    if (subs.length === 0) return;

    const payload = JSON.stringify({ title, body, icon: "/najm-logo.png", data: { url } });
    await Promise.allSettled(
      subs.map(sub =>
        firePush(sub.endpoint, sub.p256dhKey, sub.authKey, payload).catch(async (err: any) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db.delete(staffPushSubscriptionsTable).where(eq(staffPushSubscriptionsTable.endpoint, sub.endpoint));
          }
        })
      )
    );
  } catch { }
}

async function pushToStudent(userId: number, title: string, body: string, url: string) {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.warn("[push] VAPID not configured — skipping student push");
    return;
  }
  try {
    const subs = await db.select().from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId));
    console.log(`[push] student ${userId}: found ${subs.length} subscription(s)`);
    if (subs.length === 0) return;

    const payload = JSON.stringify({ title, body, icon: "/najm-logo.png", data: { url } });
    const results = await Promise.allSettled(
      subs.map(sub =>
        firePush(sub.endpoint, sub.p256dhKey, sub.authKey, payload).catch(async (err: any) => {
          console.error(`[push] delivery failed (${err.statusCode}):`, err.message);
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
          }
        })
      )
    );
    console.log(`[push] student ${userId}: sent — results:`, results.map(r => r.status));
  } catch (err) {
    console.error("[push] pushToStudent error:", err);
  }
}

router.post("/submissions", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const studentId = req.user!.id;
  const studentName = req.user!.fullName;
  const { lessonId, content, imageData } = req.body ?? {};

  if (!lessonId || !content?.trim()) {
    res.status(400).json({ error: "validation_error", message: "lessonId and content are required" });
    return;
  }

  const [submission] = await db.insert(submissionsTable).values({
    studentId,
    lessonId: Number(lessonId),
    content: content.trim(),
    imageData: imageData ?? null,
  }).returning();

  res.status(201).json(submission);

  // ── Transient push-only: notify teacher/super_admin staff ──
  try {
    const [lesson] = await db.select({ titleAr: lessonsTable.titleAr })
      .from(lessonsTable).where(eq(lessonsTable.id, Number(lessonId))).limit(1);
    const lessonTitle = lesson?.titleAr ?? "الدرس";

    await pushToStaff(
      ["teacher", "super_admin"],
      "استفسار جديد 📝",
      `الطالب ${studentName} أرسل استفساراً في درس ${lessonTitle}`,
      "/admin/submissions"
    );
  } catch (err) {
    console.error("Submission push-admin error:", err);
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
      imageData: submissionsTable.imageData,
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

  // ── Transient push-only: notify the specific student ──
  try {
    const [lesson] = await db.select({ titleAr: lessonsTable.titleAr })
      .from(lessonsTable).where(eq(lessonsTable.id, updated.lessonId)).limit(1);
    const lessonTitle = lesson?.titleAr ?? "الدرس";
    const replyText = (adminReply?.trim()) || "";

    await pushToStudent(
      updated.studentId,
      "رد جديد من الأستاذ عبد الله 👨‍🏫",
      `درس: ${lessonTitle}\nالرد: ${replyText}`,
      `/lessons/${updated.lessonId}`
    );
  } catch (err) {
    console.error("Reply push-student error:", err);
  }
});

export default router;
