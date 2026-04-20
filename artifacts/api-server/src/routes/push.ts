import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";

const router = Router();

router.get("/push/vapid-public-key", (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    res.status(503).json({ error: "service_unavailable", message: "Push notifications not configured" });
    return;
  }
  res.json({ publicKey: key });
});

router.post("/push/subscribe", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "bad_request", message: "endpoint and keys (p256dh, auth) are required" });
    return;
  }

  const existing = await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint)).limit(1);

  if (existing.length > 0) {
    res.json({ message: "Already subscribed" });
    return;
  }

  await db.insert(pushSubscriptionsTable).values({
    userId: user.id,
    endpoint,
    p256dhKey: keys.p256dh,
    authKey: keys.auth,
  });

  res.status(201).json({ message: "Subscribed successfully" });
});

router.delete("/push/unsubscribe", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { endpoint } = req.body;

  if (!endpoint) {
    res.status(400).json({ error: "bad_request", message: "endpoint is required" });
    return;
  }

  await db.delete(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.endpoint, endpoint));

  res.json({ message: "Unsubscribed successfully" });
});

export default router;
