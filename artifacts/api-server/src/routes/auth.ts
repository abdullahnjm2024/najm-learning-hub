import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, hashPassword, comparePassword, generateStudentId } from "../lib/auth";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { RegisterBody } from "@workspace/api-zod";

// Flexible login: accepts studentId OR email as identifier — no email-format enforcement
const FlexLoginBody = z.object({
  identifier: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
  password: z.string().min(1),
});

const router = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    studentId: user.studentId,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    gradeLevel: user.gradeLevel,
    accessRole: user.accessRole,
    starsBalance: user.starsBalance,
    createdAt: user.createdAt,
  };
}

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  const { email, password, fullName, phone, gradeLevel } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "conflict", message: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const studentId = generateStudentId();

  const [user] = await db.insert(usersTable).values({
    studentId,
    email,
    passwordHash,
    fullName,
    phone,
    gradeLevel: gradeLevel as any,
    accessRole: "free",
    starsBalance: 0,
  }).returning();

  const token = signToken({ userId: user.id, email: user.email, accessRole: user.accessRole });
  res.status(201).json({ token, user: formatUser(user) });
});

router.post("/auth/login", async (req, res) => {
  const parsed = FlexLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { password } = parsed.data;
  // Priority: identifier > email > studentId
  const ident = (parsed.data.identifier || parsed.data.email || parsed.data.studentId || "").trim();

  if (!ident) {
    res.status(400).json({ error: "validation_error", message: "الرجاء إدخال رقم الطالب أو البريد الإلكتروني" });
    return;
  }

  // Look up by email if "@" present (admin), otherwise look up by studentId
  let user: typeof usersTable.$inferSelect | undefined;
  if (ident.includes("@")) {
    const [found] = await db.select().from(usersTable).where(eq(usersTable.email, ident)).limit(1);
    user = found;
  } else {
    const [found] = await db.select().from(usersTable).where(eq(usersTable.studentId, ident)).limit(1);
    user = found;
  }

  if (!user) {
    res.status(401).json({ error: "unauthorized", message: "رقم الطالب أو كلمة المرور غير صحيحة" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "unauthorized", message: "رقم الطالب أو كلمة المرور غير صحيحة" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, accessRole: user.accessRole });
  res.json({ token, user: formatUser(user) });
});

router.post("/auth/change-password", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const ChangePasswordBody = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6, "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"),
  });
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  if (!dbUser) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }
  const valid = await comparePassword(parsed.data.currentPassword, dbUser.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "unauthorized", message: "كلمة المرور الحالية غير صحيحة" });
    return;
  }
  const newHash = await hashPassword(parsed.data.newPassword);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
  res.json({ message: "تم تغيير كلمة المرور بنجاح" });
});

router.get("/auth/me", authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1).then(([dbUser]) => {
    if (!dbUser) {
      res.status(404).json({ error: "not_found", message: "User not found" });
      return;
    }
    res.json(formatUser(dbUser));
  });
});

export default router;
