import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "najm_edu_fallback_secret";
const JWT_EXPIRES_IN = "30d";

export interface JwtPayload {
  userId: number;
  email: string;
  accessRole: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface StaffJwtPayload {
  staffId: number;
  adminId: string;
  staffRole: string;
  type: "staff";
}

export function signStaffToken(payload: Omit<StaffJwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "staff" }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyStaffToken(token: string): StaffJwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as StaffJwtPayload;
  if (decoded.type !== "staff") throw new Error("Not a staff token");
  return decoded;
}

export function generateStudentId(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `NJM${year}${random}`;
}
