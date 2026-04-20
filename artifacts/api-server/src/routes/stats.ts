import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, lessonsTable, examsTable, examAttemptsTable } from "@workspace/db";
import { eq, sql, and, gte } from "drizzle-orm";
import { authenticateStaff } from "../middlewares/authenticate";

const router = Router();

router.get("/stats", async (_req, res) => {
  const [countRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usersTable);
  res.json({ totalStudents: Number(countRes?.count || 0) });
});

router.get("/stats/dashboard", authenticateStaff, async (_req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalStudentsRes,
    paidStudentsRes,
    freeStudentsRes,
    totalLessonsRes,
    totalExamsRes,
    totalAttemptsRes,
    recentRegsRes,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(usersTable),
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.accessRole, "paid")),
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.accessRole, "free")),
    db.select({ count: sql<number>`count(*)` }).from(lessonsTable),
    db.select({ count: sql<number>`count(*)` }).from(examsTable),
    db.select({ count: sql<number>`count(*)` }).from(examAttemptsTable),
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(
      gte(usersTable.createdAt, sevenDaysAgo)
    ),
  ]);

  res.json({
    totalStudents: Number(totalStudentsRes[0]?.count || 0),
    paidStudents: Number(paidStudentsRes[0]?.count || 0),
    freeStudents: Number(freeStudentsRes[0]?.count || 0),
    totalLessons: Number(totalLessonsRes[0]?.count || 0),
    totalExams: Number(totalExamsRes[0]?.count || 0),
    totalAttempts: Number(totalAttemptsRes[0]?.count || 0),
    recentRegistrations: Number(recentRegsRes[0]?.count || 0),
  });
});

router.get("/stats/grade-summary", authenticateStaff, async (_req, res) => {
  const grades = ["grade9", "grade12_sci", "grade12_lit", "english", "ielts", "steps1000"];

  const results = await Promise.all(
    grades.map(async (grade) => {
      const [countRes] = await db.select({ count: sql<number>`count(*)` })
        .from(usersTable)
        .where(eq(usersTable.gradeLevel, grade as any));
      const [paidRes] = await db.select({ count: sql<number>`count(*)` })
        .from(usersTable)
        .where(and(eq(usersTable.gradeLevel, grade as any), eq(usersTable.accessRole, "paid")));
      return {
        gradeLevel: grade,
        count: Number(countRes?.count || 0),
        paidCount: Number(paidRes?.count || 0),
      };
    })
  );

  res.json(results);
});

export default router;
