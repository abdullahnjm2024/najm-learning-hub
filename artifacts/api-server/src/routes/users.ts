import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, like, and, or, sql, desc, inArray } from "drizzle-orm";
import { authenticateStaff, type StaffAuthenticatedRequest } from "../middlewares/authenticate";
import { UpdateUserStarsBody } from "@workspace/api-zod";
import { hashPassword } from "../lib/auth";

const router = Router();

const GRADE_LEVELS = [
  "grade9", "grade12_sci", "grade12_lit", "english",
  "ielts", "steps1000",
] as const;

const CreateStudentBody = z.object({
  studentId: z.string().min(1, "رقم الطالب مطلوب"),
  fullName: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().min(1, "الهاتف مطلوب"),
  gradeLevel: z.enum(GRADE_LEVELS),
  password: z.string().min(4, "كلمة المرور يجب أن تكون 4 أحرف على الأقل"),
  accessRole: z.enum(["free", "paid"]).default("free"),
});

const UpdateStudentBody = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  gradeLevel: z.enum(GRADE_LEVELS).optional(),
  password: z.string().min(4).optional(),
  accessRole: z.enum(["free", "paid"]).optional(),
  paidSubjectIds: z.array(z.number().int()).optional(),
});

const UpdateAccessBody = z.object({
  accessRole: z.enum(["free", "paid"]),
});

function syntheticEmail(studentId: string): string {
  return `${studentId.toLowerCase()}@sync.najm-edu`;
}

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
    paidSubjectIds: user.paidSubjectIds ?? [],
    createdAt: user.createdAt,
  };
}

router.get("/users", authenticateStaff, async (req: StaffAuthenticatedRequest, res) => {
  const { search, gradeLevel, accessRole, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const isTeacher = req.staff?.staffRole === "teacher";
  const teacherTracks = req.staff?.assignedTracks ?? [];

  if (isTeacher && teacherTracks.length === 0) {
    res.json({ users: [], total: 0, page: pageNum, limit: limitNum });
    return;
  }

  const conditions = [];
  if (isTeacher) {
    conditions.push(inArray(usersTable.gradeLevel, teacherTracks as any[]));
  }
  if (search) {
    conditions.push(
      or(
        like(usersTable.fullName, `%${search}%`),
        like(usersTable.studentId, `%${search}%`),
        like(usersTable.email, `%${search}%`)
      )
    );
  }
  if (gradeLevel) {
    conditions.push(eq(usersTable.gradeLevel, gradeLevel as any));
  }
  if (accessRole) {
    conditions.push(eq(usersTable.accessRole, accessRole as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [users, countResult] = await Promise.all([
    db.select().from(usersTable).where(whereClause).orderBy(desc(usersTable.createdAt)).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(whereClause),
  ]);

  res.json({
    users: users.map(formatUser),
    total: Number(countResult[0]?.count || 0),
    page: pageNum,
    limit: limitNum,
  });
});

router.get("/users/:studentId", authenticateStaff, async (req, res) => {
  const studentId = req.params.studentId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.studentId, studentId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "not_found", message: "Student not found" });
    return;
  }
  res.json(formatUser(user));
});

router.post("/users", authenticateStaff, async (req, res) => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { studentId, fullName, phone, gradeLevel, password, accessRole } = parsed.data;
  const email = syntheticEmail(studentId);

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.studentId, studentId), eq(usersTable.email, email)))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "conflict", message: "رقم الطالب موجود مسبقاً" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(usersTable)
    .values({ studentId, email, passwordHash, fullName, phone, gradeLevel: gradeLevel as any, accessRole: accessRole as any, starsBalance: 0, paidSubjectIds: [] })
    .returning();

  res.status(201).json(formatUser(created));
});

router.put("/users/:studentId", authenticateStaff, async (req, res) => {
  const studentId = req.params.studentId as string;
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { password, paidSubjectIds, ...rest } = parsed.data;
  const updateData: Record<string, any> = { ...rest };
  if (password) {
    updateData.passwordHash = await hashPassword(password);
  }
  if (paidSubjectIds !== undefined) {
    updateData.paidSubjectIds = paidSubjectIds;
  }
  // When setting to free, clear paidSubjectIds
  if (rest.accessRole === "free") {
    updateData.paidSubjectIds = [];
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "bad_request", message: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.studentId, studentId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Student not found" });
    return;
  }
  res.json(formatUser(updated));
});

router.delete("/users/:studentId", authenticateStaff, async (req, res) => {
  const studentId = req.params.studentId as string;
  const [target] = await db.select().from(usersTable).where(eq(usersTable.studentId, studentId)).limit(1);
  if (!target) {
    res.status(404).json({ error: "not_found", message: "Student not found" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.studentId, studentId));
  res.status(204).end();
});

router.patch("/users/:studentId/access", authenticateStaff, async (req, res) => {
  const studentId = req.params.studentId as string;
  const parsed = UpdateAccessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const updateData: Record<string, any> = { accessRole: parsed.data.accessRole };
  if (parsed.data.accessRole === "free") {
    updateData.paidSubjectIds = [];
  }

  const [updated] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.studentId, studentId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Student not found" });
    return;
  }
  res.json(formatUser(updated));
});

router.post("/users/:studentId/impersonate", authenticateStaff, async (req, res) => {
  const studentId = req.params.studentId as string;
  const [student] = await db.select().from(usersTable).where(eq(usersTable.studentId, studentId)).limit(1);
  if (!student) {
    res.status(404).json({ error: "not_found", message: "Student not found" });
    return;
  }
  const jwt = await import("jsonwebtoken");
  const secret = process.env.JWT_SECRET || "najm_edu_fallback_secret";
  const token = jwt.default.sign(
    { userId: student.id, email: student.email, accessRole: student.accessRole },
    secret,
    { expiresIn: "2h" }
  );
  res.json({ token, user: formatUser(student) });
});

router.patch("/users/:studentId/stars", authenticateStaff, async (req, res) => {
  const studentId = req.params.studentId as string;
  const parsed = UpdateUserStarsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ starsBalance: parsed.data.starsBalance })
    .where(eq(usersTable.studentId, studentId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Student not found" });
    return;
  }
  res.json(formatUser(updated));
});

export default router;
