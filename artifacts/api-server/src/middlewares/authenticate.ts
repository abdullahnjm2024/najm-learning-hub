import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { verifyToken, verifyStaffToken } from "../lib/auth";
import { db } from "@workspace/db";
import { usersTable, staffTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface StaffInfo {
  id: number;
  adminId: string;
  staffRole: string;
  fullName: string;
  assignedTracks: string[];
  assignedSubjectIds: number[];
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    accessRole: string;
    studentId: string;
    fullName: string;
    gradeLevel: string;
    starsBalance: number;
    paidSubjectIds: number[];
  };
  staff?: StaffInfo;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "No token provided" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "unauthorized", message: "User not found" });
      return;
    }
    req.user = {
      id: user.id,
      email: user.email,
      accessRole: user.accessRole,
      studentId: user.studentId,
      fullName: user.fullName,
      gradeLevel: user.gradeLevel,
      starsBalance: user.starsBalance,
      paidSubjectIds: user.paidSubjectIds ?? [],
    };
    next();
  } catch {
    res.status(401).json({ error: "unauthorized", message: "Invalid token" });
  }
}

export interface StaffAuthenticatedRequest extends Request {
  staff?: StaffInfo;
}

export async function authenticateStaff(
  req: StaffAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "No token provided" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyStaffToken(token);
    const [staff] = await db.select().from(staffTable).where(eq(staffTable.id, payload.staffId)).limit(1);
    if (!staff || !staff.isActive) {
      res.status(401).json({ error: "unauthorized", message: "Admin not found or inactive" });
      return;
    }
    req.staff = { id: staff.id, adminId: staff.adminId, staffRole: staff.role, fullName: staff.fullName, assignedTracks: staff.assignedTracks, assignedSubjectIds: staff.assignedSubjectIds };
    next();
  } catch {
    res.status(401).json({ error: "unauthorized", message: "Invalid token" });
  }
}

export async function authenticateAny(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "No token provided" });
    return;
  }
  const token = authHeader.slice(7);

  // Peek at token type without full verification first
  let tokenType: string | undefined;
  try {
    const decoded = jwt.decode(token) as Record<string, unknown> | null;
    tokenType = decoded?.type as string | undefined;
  } catch { /* ignore */ }

  if (tokenType === "staff") {
    // Staff token path
    try {
      const payload = verifyStaffToken(token);
      const [staff] = await db.select().from(staffTable).where(eq(staffTable.id, payload.staffId)).limit(1);
      if (staff && staff.isActive) {
        req.staff = { id: staff.id, adminId: staff.adminId, staffRole: staff.role, fullName: staff.fullName, assignedTracks: staff.assignedTracks, assignedSubjectIds: staff.assignedSubjectIds };
        next();
        return;
      }
    } catch { /* fall through to 401 */ }
  } else {
    // Student token path
    try {
      const payload = verifyToken(token);
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          accessRole: user.accessRole,
          studentId: user.studentId,
          fullName: user.fullName,
          gradeLevel: user.gradeLevel,
          starsBalance: user.starsBalance,
          paidSubjectIds: user.paidSubjectIds ?? [],
        };
        next();
        return;
      }
    } catch { /* fall through to 401 */ }
  }
  res.status(401).json({ error: "unauthorized", message: "Invalid token" });
}

export function requireSuperAdmin(
  req: StaffAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.staff?.staffRole !== "super_admin") {
    res.status(403).json({ error: "forbidden", message: "Super admin access required" });
    return;
  }
  next();
}
