import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { staffTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signStaffToken, hashPassword, comparePassword } from "../lib/auth";
import { authenticateStaff, type StaffAuthenticatedRequest } from "../middlewares/authenticate";
import type { Staff } from "@workspace/db";

const router = Router();

function formatStaff(staff: Staff) {
  return {
    id: staff.id,
    adminId: staff.adminId,
    fullName: staff.fullName,
    role: staff.role,
    assignedTracks: staff.assignedTracks,
    assignedSubjectIds: staff.assignedSubjectIds,
    isActive: staff.isActive,
    createdAt: staff.createdAt,
    createdById: staff.createdById,
  };
}

router.post("/staff/auth/login", async (req, res) => {
  const parsed = z.object({
    adminId: z.string().min(1),
    password: z.string().min(1),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: "الرقم الإداري وكلمة المرور مطلوبان" });
    return;
  }

  const { adminId, password } = parsed.data;
  const [staff] = await db.select().from(staffTable).where(eq(staffTable.adminId, adminId.toUpperCase().trim())).limit(1);

  if (!staff || !staff.isActive) {
    res.status(401).json({ error: "unauthorized", message: "الرقم الإداري أو كلمة المرور غير صحيحة" });
    return;
  }

  const valid = await comparePassword(password, staff.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "unauthorized", message: "الرقم الإداري أو كلمة المرور غير صحيحة" });
    return;
  }

  const token = signStaffToken({ staffId: staff.id, adminId: staff.adminId, staffRole: staff.role });
  res.json({ token, staff: formatStaff(staff) });
});

router.get("/staff/auth/me", authenticateStaff, async (req: StaffAuthenticatedRequest, res) => {
  const [staff] = await db.select().from(staffTable).where(eq(staffTable.id, req.staff!.id)).limit(1);
  if (!staff) {
    res.status(404).json({ error: "not_found", message: "Admin not found" });
    return;
  }
  res.json(formatStaff(staff));
});

export default router;
