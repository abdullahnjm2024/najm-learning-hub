import { Router } from "express";
import { db } from "@workspace/db";
import { milestonesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";

const router = Router();

router.get("/milestones/my", authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const milestones = await db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.studentId, userId))
    .orderBy(desc(milestonesTable.attainedAt));
  res.json(milestones);
});

export default router;
