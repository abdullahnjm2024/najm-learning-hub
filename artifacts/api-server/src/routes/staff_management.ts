import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { staffTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import { hashPassword } from "../lib/auth";
import { authenticateStaff, requireSuperAdmin, type StaffAuthenticatedRequest } from "../middlewares/authenticate";
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

const StaffCreateBody = z.object({
  adminId: z.string().min(3, "الرقم الإداري يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().min(4, "كلمة المرور يجب أن تكون 4 أحرف على الأقل"),
  fullName: z.string().min(2, "الاسم مطلوب"),
  role: z.enum(["teacher", "supervisor"]),
  assignedTracks: z.array(z.string()).default([]),
  assignedSubjectIds: z.array(z.number()).default([]),
});

const StaffUpdateBody = z.object({
  adminId: z.string().min(3).optional(),
  password: z.string().min(4).optional(),
  fullName: z.string().min(2).optional(),
  role: z.enum(["teacher", "supervisor"]).optional(),
  assignedTracks: z.array(z.string()).optional(),
  assignedSubjectIds: z.array(z.number()).optional(),
  isActive: z.boolean().optional(),
});

router.get("/staff/management/staff", authenticateStaff, requireSuperAdmin, async (_req, res) => {
  const allStaff = await db.select().from(staffTable).where(ne(staffTable.role, "super_admin"));
  res.json(allStaff.map(formatStaff));
});

router.get("/staff/management/staff/:id", authenticateStaff, requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "invalid_id" }); return; }
  const [staff] = await db.select().from(staffTable).where(eq(staffTable.id, id)).limit(1);
  if (!staff) { res.status(404).json({ error: "not_found" }); return; }
  res.json(formatStaff(staff));
});

router.post("/staff/management/staff", authenticateStaff, requireSuperAdmin, async (req: StaffAuthenticatedRequest, res) => {
  const parsed = StaffCreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.errors[0]?.message || "Validation failed" });
    return;
  }

  const { adminId, password, fullName, role, assignedTracks, assignedSubjectIds } = parsed.data;
  const normalizedId = adminId.toUpperCase().trim();

  const existing = await db.select({ id: staffTable.id }).from(staffTable).where(eq(staffTable.adminId, normalizedId)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "conflict", message: "هذا الرقم الإداري مسجل مسبقاً" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [staff] = await db.insert(staffTable).values({
    adminId: normalizedId,
    passwordHash,
    fullName,
    role,
    assignedTracks,
    assignedSubjectIds,
    isActive: true,
    createdById: req.staff!.id,
  }).returning();

  res.status(201).json(formatStaff(staff));
});

router.put("/staff/management/staff/:id", authenticateStaff, requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "invalid_id" }); return; }

  const parsed = StaffUpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.errors[0]?.message || "Validation failed" });
    return;
  }

  const updates: Partial<typeof staffTable.$inferInsert> = {};
  if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName;
  if (parsed.data.adminId !== undefined) updates.adminId = parsed.data.adminId.toUpperCase().trim();
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.assignedTracks !== undefined) updates.assignedTracks = parsed.data.assignedTracks;
  if (parsed.data.assignedSubjectIds !== undefined) updates.assignedSubjectIds = parsed.data.assignedSubjectIds;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
  if (parsed.data.password) updates.passwordHash = await hashPassword(parsed.data.password);

  const [updated] = await db.update(staffTable).set(updates).where(eq(staffTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "not_found" }); return; }

  res.json(formatStaff(updated));
});

router.delete("/staff/management/staff/:id", authenticateStaff, requireSuperAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "invalid_id" }); return; }
  await db.delete(staffTable).where(eq(staffTable.id, id));
  res.json({ success: true });
});

export default router;
