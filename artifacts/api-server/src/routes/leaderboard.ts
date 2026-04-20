import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";

const router = Router();

router.get("/leaderboard", authenticate, async (req: AuthenticatedRequest, res) => {
  const { gradeLevel, limit = "100" } = req.query as Record<string, string>;
  const limitNum = Math.min(500, Math.max(1, parseInt(limit)));
  const currentUserId = req.user!.id;

  const whereClause = gradeLevel
    ? eq(usersTable.gradeLevel, gradeLevel as any)
    : undefined;

  const [allUsers, totalResult] = await Promise.all([
    db.select({
      id: usersTable.id,
      studentId: usersTable.studentId,
      fullName: usersTable.fullName,
      gradeLevel: usersTable.gradeLevel,
      starsBalance: usersTable.starsBalance,
    }).from(usersTable)
      .where(whereClause)
      .orderBy(desc(usersTable.starsBalance), usersTable.fullName)
      .limit(limitNum),
    db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(whereClause),
  ]);

  const entries = allUsers.map((u, idx) => ({
    rank: idx + 1,
    studentId: u.studentId,
    fullName: u.fullName,
    gradeLevel: u.gradeLevel,
    starsBalance: u.starsBalance,
    isCurrentUser: u.id === currentUserId,
  }));

  res.json({ entries, total: Number(totalResult[0]?.count || 0) });
});

router.get("/leaderboard/my-rank", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  if (!currentUser) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }

  const [higherResult] = await db.select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(sql`${usersTable.starsBalance} > ${currentUser.starsBalance}`);

  const [totalResult] = await db.select({ count: sql<number>`count(*)` })
    .from(usersTable);

  const rank = Number(higherResult?.count || 0) + 1;
  const total = Number(totalResult?.count || 0);
  const percentile = total > 0 ? Math.round(((total - rank) / total) * 100) : 0;

  res.json({
    rank,
    total,
    starsBalance: currentUser.starsBalance,
    percentile,
  });
});

export default router;
