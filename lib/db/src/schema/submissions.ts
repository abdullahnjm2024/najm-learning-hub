import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  content: text("content").notNull(),
  adminReply: text("admin_reply"),
  imageData: text("image_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Submission = typeof submissionsTable.$inferSelect;
export type InsertSubmission = typeof submissionsTable.$inferInsert;
