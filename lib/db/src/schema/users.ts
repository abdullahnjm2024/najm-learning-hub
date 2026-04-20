import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gradeLevelEnum = pgEnum("grade_level", [
  "grade9",
  "grade12_sci",
  "grade12_lit",
  "english",
  "ielts",
  "steps1000",
]);

export const accessRoleEnum = pgEnum("access_role", ["free", "paid"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  gradeLevel: gradeLevelEnum("grade_level").notNull(),
  accessRole: accessRoleEnum("access_role").notNull().default("free"),
  starsBalance: integer("stars_balance").notNull().default(0),
  paidSubjectIds: integer("paid_subject_ids").array().notNull().default(sql`ARRAY[]::integer[]`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
