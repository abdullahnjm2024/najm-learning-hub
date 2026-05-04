import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const milestonesTable = pgTable("milestones", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  type: text("type").notNull(), // "unit_complete" | "subject_complete"
  referenceId: integer("reference_id").notNull(),
  title: text("title").notNull(),
  attainedAt: timestamp("attained_at").notNull().defaultNow(),
});

export type Milestone = typeof milestonesTable.$inferSelect;
export type InsertMilestone = typeof milestonesTable.$inferInsert;
