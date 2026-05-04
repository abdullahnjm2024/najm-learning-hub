import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { authenticate, authenticateStaff, type AuthenticatedRequest, type StaffAuthenticatedRequest } from "../middlewares/authenticate";
import XLSX from "xlsx";

const router = Router();

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
