import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, userNotificationsTable, usersTable, pushSubscriptionsTable } from "@workspace/db";
import { eq, and, desc, or, isNull, sql } from "drizzle-orm";
import { authenticate, authenticateStaff, type AuthenticatedRequest } from "../middlewares/authenticate";
import { CreateNotificationBody } from "@workspace/api-zod";
import webpush from "web-push";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const router = Router();

router.get("/notifications", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;

  const results = await db
    .select({
      id: notificationsTable.id,
      title: notificationsTable.title,
      titleAr: notificationsTable.titleAr,
      body: notificationsTable.body,
      bodyAr: notificationsTable.bodyAr,
      type: notificationsTable.type,
      gradeLevel: notificationsTable.gradeLevel,
      isRead: sql<boolean>`COALESCE(${userNotificationsTable.isRead}, false)`,
      createdAt: notificationsTable.createdAt,
    })
    .from(notificationsTable)
    .leftJoin(
      userNotificationsTable,
      and(
        eq(userNotificationsTable.notificationId, notificationsTable.id),
        eq(userNotificationsTable.userId, user.id)
      )
    )
    .where(
      or(
        isNull(notificationsTable.gradeLevel),
        eq(notificationsTable.gradeLevel, user.gradeLevel)
      )
    )
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(results);
});

router.post("/notifications", authenticateStaff, async (req: AuthenticatedRequest, res) => {
  const parsed = CreateNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const [notification] = await db.insert(notificationsTable).values({
    ...parsed.data,
    gradeLevel: parsed.data.gradeLevel ?? null,
  }).returning();

  res.status(201).json({
    ...notification,
    isRead: false,
  });

  if (process.env.VAPID_PUBLIC_KEY) {
    try {
      let subsQuery = db.select().from(pushSubscriptionsTable);
      let subscriptions: typeof pushSubscriptionsTable.$inferSelect[];

      if (parsed.data.gradeLevel) {
        const targetUsers = await db.select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.gradeLevel, parsed.data.gradeLevel as any));
        const userIds = targetUsers.map(u => u.id);
        if (userIds.length === 0) return;
        subscriptions = await db.select().from(pushSubscriptionsTable);
        subscriptions = subscriptions.filter(s => userIds.includes(s.userId));
      } else {
        subscriptions = await db.select().from(pushSubscriptionsTable);
      }

      const payload = JSON.stringify({
        title: notification.titleAr || notification.title || "إشعار جديد",
        body: notification.bodyAr || notification.body || "",
        icon: "/favicon.svg",
        data: { notificationId: notification.id },
      });

      await Promise.allSettled(
        subscriptions.map(sub =>
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
    } catch {
    }
  }
});

router.patch("/notifications/:id/read", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "bad_request", message: "Invalid ID" });
    return;
  }

  const existing = await db.select().from(userNotificationsTable)
    .where(and(eq(userNotificationsTable.notificationId, id), eq(userNotificationsTable.userId, user.id)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(userNotificationsTable)
      .set({ isRead: true })
      .where(and(eq(userNotificationsTable.notificationId, id), eq(userNotificationsTable.userId, user.id)));
  } else {
    await db.insert(userNotificationsTable).values({
      notificationId: id,
      userId: user.id,
      isRead: true,
    });
  }

  const [notification] = await db.select().from(notificationsTable).where(eq(notificationsTable.id, id)).limit(1);
  res.json({ ...notification, isRead: true });
});

export default router;
