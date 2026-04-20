import { pgTable, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const lessonProgressTable = pgTable("lesson_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LessonProgress = typeof lessonProgressTable.$inferSelect;
export type InsertLessonProgress = typeof lessonProgressTable.$inferInsert;
