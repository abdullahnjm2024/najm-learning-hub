import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth";

const router = Router();

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

const DEFAULT_PASSWORD = "123456";

const SyncStudentBody = z.object({
  studentId: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().min(1),
  gradeLevel: z.enum(["grade9", "grade12_sci", "grade12_lit", "english", "ielts", "steps1000"]),
});

function syntheticEmail(studentId: string): string {
  return `${studentId.toLowerCase()}@sync.najm-edu`;
}

router.post("/webhook/sync-student", async (req, res) => {
  const secret = req.headers["x-webhook-secret"];
  if (!isValidWebhookSecret(secret as string)) {
    res.status(401).json({ error: "unauthorized", message: "Invalid webhook secret" });
    return;
  }

  const parsed = SyncStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { studentId, fullName, phone, gradeLevel } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.studentId, studentId))
    .limit(1);

  if (existing) {
    // UPDATE existing student — preserve email, password, stars, role
    const [updated] = await db
      .update(usersTable)
      .set({ fullName, phone, gradeLevel: gradeLevel as any })
      .where(eq(usersTable.studentId, studentId))
      .returning();

    res.json({
      action: "updated",
      studentId: updated.studentId,
      fullName: updated.fullName,
      gradeLevel: updated.gradeLevel,
    });
    return;
  }

  // CREATE new student with default password
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const email = syntheticEmail(studentId);

  const [created] = await db
    .insert(usersTable)
    .values({
      studentId,
      email,
      passwordHash,
      fullName,
      phone,
      gradeLevel: gradeLevel as any,
      accessRole: "free",
      starsBalance: 0,
    })
    .returning();

  res.status(201).json({
    action: "created",
    studentId: created.studentId,
    fullName: created.fullName,
    gradeLevel: created.gradeLevel,
    defaultPassword: DEFAULT_PASSWORD,
  });
});

const UpdateStarsBody = z.object({
  studentId: z.string().min(1),
  totalStars: z.number().int().min(0),
});

router.post("/webhook/update-stars", async (req, res) => {
  const secret = req.headers["x-webhook-secret"];
  if (!isValidWebhookSecret(secret as string)) {
    res.status(401).json({ error: "unauthorized", message: "Invalid webhook secret" });
    return;
  }

  const parsed = UpdateStarsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { studentId, totalStars } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.studentId, studentId))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "not_found", message: `Student not found: ${studentId}` });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ starsBalance: totalStars })
    .where(eq(usersTable.studentId, studentId))
    .returning();

  res.status(200).json({
    action: "stars_updated",
    studentId: updated.studentId,
    starsBalance: updated.starsBalance,
  });
});

export default router;
