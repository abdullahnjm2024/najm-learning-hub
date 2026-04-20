import { pgTable, text, serial, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const staffRoleEnum = pgEnum("staff_role", ["teacher", "supervisor", "super_admin"]);

export const staffTable = pgTable("staff", {
  id: serial("id").primaryKey(),
  adminId: text("admin_id").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: staffRoleEnum("role").notNull(),
  assignedTracks: text("assigned_tracks").array().notNull().default(sql`ARRAY[]::text[]`),
  assignedSubjectIds: integer("assigned_subject_ids").array().notNull().default(sql`ARRAY[]::integer[]`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdById: integer("created_by_id"),
});

export type Staff = typeof staffTable.$inferSelect;
export type InsertStaff = typeof staffTable.$inferInsert;
