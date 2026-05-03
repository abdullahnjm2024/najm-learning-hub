import { Router } from "express";
import { db } from "@workspace/db";
import { submissionsTable, usersTable, lessonsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate, authenticateStaff, type AuthenticatedRequest, type StaffAuthenticatedRequest } from "../middlewares/authenticate";

const router = Router();

router.post("/submissions", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const studentId = req.user!.id;
  const { lessonId, content } = req.body ?? {};

  if (!lessonId || !content?.trim()) {
    res.status(400).json({ error: "validation_error", message: "lessonId and content are required" });
    return;
  }

  const [submission] = await db.insert(submissionsTable).values({
    studentId,
    lessonId: Number(lessonId),
    content: content.trim(),
  }).returning();

  res.status(201).json(submission);
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
});

export default router;
