import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { sql, eq, and, or, ilike, desc } from "drizzle-orm";
import { authenticate, authenticateStaff, type AuthenticatedRequest, type StaffAuthenticatedRequest } from "../middlewares/authenticate";
import { signToken, hashPassword, comparePassword } from "../lib/auth";
import XLSX from "xlsx";

const router = Router();

// ─── Student self-serve ────────────────────────────────────────────────────

router.get("/users/me", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  if (!dbUser) { res.status(404).json({ error: "not_found" }); return; }
  const { passwordHash, ...safe } = dbUser;
  res.json(safe);
});

router.patch("/users/me", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  const { fullName, phone } = req.body;

  const updateData: Partial<typeof usersTable.$inferInsert> = {};
  if (fullName) updateData.fullName = fullName;
  if (phone) updateData.phone = phone;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "bad_request", message: "No fields to update" });
    return;
  }

  const [updated] = await db.update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, user.id))
    .returning();

  if (!updated) { res.status(404).json({ error: "not_found" }); return; }
  const { passwordHash, ...safe } = updated;
  res.json(safe);
});

// ─── Admin: list & create ──────────────────────────────────────────────────

router.get("/users", authenticateStaff, async (req: StaffAuthenticatedRequest, res): Promise<void> => {
  const search = (req.query.search as string) || "";
  const gradeLevel = (req.query.gradeLevel as string) || "";
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  if (gradeLevel) {
    conditions.push(eq(usersTable.gradeLevel, gradeLevel as any));
  }
  if (search.trim()) {
    const pattern = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(usersTable.fullName, pattern),
        ilike(usersTable.studentId, pattern),
        ilike(usersTable.phone, pattern)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(where),
    db.select().from(usersTable).where(where).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const users = rows.map(({ passwordHash, ...u }) => u);

  res.json({ users, total, page, limit });
});

router.post("/users", authenticateStaff, async (req: StaffAuthenticatedRequest, res): Promise<void> => {
  const { studentId, fullName, phone, gradeLevel, accessRole, password } = req.body;

  if (!studentId || !fullName || !phone || !gradeLevel || !password) {
    res.status(400).json({ error: "bad_request", message: "جميع الحقول مطلوبة" });
    return;
  }

  const existing = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.studentId, studentId))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "conflict", message: "رقم الطالب مستخدم بالفعل" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const email = `${studentId}@najm.edu`;

  const [created] = await db.insert(usersTable).values({
    studentId,
    fullName,
    phone,
    gradeLevel: gradeLevel as any,
    accessRole: (accessRole || "free") as any,
    passwordHash,
    email,
  }).returning();

  const { passwordHash: _, ...safe } = created;
  res.status(201).json(safe);
});

// ─── Admin: per-student operations ────────────────────────────────────────

router.get("/users/:studentId", authenticateStaff, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.studentId, req.params.studentId))
    .limit(1);
  if (!user) { res.status(404).json({ error: "not_found" }); return; }
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

router.put("/users/:studentId", authenticateStaff, async (req: StaffAuthenticatedRequest, res): Promise<void> => {
  const { fullName, phone, gradeLevel, accessRole, password, paidSubjectIds, isSuspended, suspensionReason } = req.body;

  const updateData: Partial<typeof usersTable.$inferInsert> = {};
  if (fullName !== undefined) updateData.fullName = fullName;
  if (phone !== undefined) updateData.phone = phone;
  if (gradeLevel !== undefined) updateData.gradeLevel = gradeLevel as any;
  if (accessRole !== undefined) updateData.accessRole = accessRole as any;
  if (paidSubjectIds !== undefined) updateData.paidSubjectIds = paidSubjectIds;
  if (isSuspended !== undefined) updateData.isSuspended = isSuspended;
  if (suspensionReason !== undefined) updateData.suspensionReason = suspensionReason;
  if (password && password.length >= 4) {
    updateData.passwordHash = await hashPassword(password);
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "bad_request", message: "لا توجد بيانات للتحديث" });
    return;
  }

  const [updated] = await db.update(usersTable)
    .set(updateData)
    .where(eq(usersTable.studentId, req.params.studentId))
    .returning();

  if (!updated) { res.status(404).json({ error: "not_found" }); return; }
  const { passwordHash, ...safe } = updated;
  res.json(safe);
});

router.delete("/users/:studentId", authenticateStaff, async (req, res): Promise<void> => {
  const deleted = await db.delete(usersTable)
    .where(eq(usersTable.studentId, req.params.studentId))
    .returning({ id: usersTable.id });

  if (deleted.length === 0) { res.status(404).json({ error: "not_found" }); return; }
  res.status(204).send();
});

router.patch("/users/:studentId/access", authenticateStaff, async (req: StaffAuthenticatedRequest, res): Promise<void> => {
  const { accessRole } = req.body;
  if (!["free", "paid"].includes(accessRole)) {
    res.status(400).json({ error: "bad_request", message: "دور غير صالح" });
    return;
  }

  const [updated] = await db.update(usersTable)
    .set({ accessRole: accessRole as any })
    .where(eq(usersTable.studentId, req.params.studentId))
    .returning();

  if (!updated) { res.status(404).json({ error: "not_found" }); return; }
  const { passwordHash, ...safe } = updated;
  res.json(safe);
});

router.patch("/users/:studentId/stars", authenticateStaff, async (req: StaffAuthenticatedRequest, res): Promise<void> => {
  const starsBalance = parseInt(req.body.starsBalance);
  if (isNaN(starsBalance) || starsBalance < 0) {
    res.status(400).json({ error: "bad_request", message: "قيمة النجوم غير صالحة" });
    return;
  }

  const [updated] = await db.update(usersTable)
    .set({ starsBalance })
    .where(eq(usersTable.studentId, req.params.studentId))
    .returning();

  if (!updated) { res.status(404).json({ error: "not_found" }); return; }
  const { passwordHash, ...safe } = updated;
  res.json(safe);
});

router.post("/users/:studentId/impersonate", authenticateStaff, async (req: StaffAuthenticatedRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.studentId, req.params.studentId))
    .limit(1);

  if (!user) { res.status(404).json({ error: "not_found", message: "الطالب غير موجود" }); return; }

  const token = signToken({ userId: user.id, email: user.email, accessRole: user.accessRole });
  const { passwordHash, ...safe } = user;
  res.json({ token, user: safe });
});

// ─── Admin: Excel report ───────────────────────────────────────────────────

const GRADE_LABELS: Record<string, string> = {
  grade9: "الصف التاسع",
  grade12_sci: "بكالوريا علمي",
  grade12_lit: "بكالوريا أدبي",
  english: "اللغة الإنجليزية",
  ielts: "تحضير الآيلتس",
  steps1000: "مشروع 1000 خطوة",
};

router.get("/admin/report/students", authenticateStaff, async (_req: StaffAuthenticatedRequest, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      u.full_name        AS "fullName",
      u.student_id       AS "studentId",
      u.grade_level      AS "gradeLevel",
      u.access_role      AS "accessRole",
      u.stars_balance    AS "starsBalance",
      COALESCE(lp.completed, 0)::int   AS "completedLessons",
      COALESCE(ea.best_pct, 0)::int    AS "bestExamScore"
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) FILTER (WHERE is_completed = true) AS completed
      FROM lesson_progress
      GROUP BY user_id
    ) lp ON lp.user_id = u.id
    LEFT JOIN (
      SELECT user_id,
        MAX(CASE WHEN max_score > 0 THEN ROUND(score::numeric / max_score * 100) ELSE 0 END) AS best_pct
      FROM exam_attempts
      GROUP BY user_id
    ) ea ON ea.user_id = u.id
    WHERE u.access_role IN ('free', 'paid')
    ORDER BY u.stars_balance DESC, u.full_name
  `);

  const rows = result.rows.map((s: any) => ({
    "اسم الطالب": s.fullName,
    "رقم الطالب": s.studentId,
    "المرحلة الدراسية": GRADE_LABELS[s.gradeLevel] ?? s.gradeLevel,
    "نوع العضوية": s.accessRole === "paid" ? "مدفوع" : "مجاني",
    "النجوم": s.starsBalance,
    "الدروس المنجزة": s.completedLessons,
    "أفضل درجة اختبار (%)": s.bestExamScore,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 26 }, { wch: 14 }, { wch: 22 },
    { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "الطلاب");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="report.xlsx"');
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  res.send(buf);
});

export default router;
