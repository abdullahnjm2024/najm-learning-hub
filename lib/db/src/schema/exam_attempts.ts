import { pgTable, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { examsTable } from "./exams";

export const examAttemptsTable = pgTable("exam_attempts", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id")
    .notNull()
    .references(() => examsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  isBestScore: boolean("is_best_score").notNull().default(false),
  starsEarned: integer("stars_earned").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExamAttemptSchema = createInsertSchema(examAttemptsTable).omit({ id: true, createdAt: true });
export type InsertExamAttempt = z.infer<typeof insertExamAttemptSchema>;
export type ExamAttempt = typeof examAttemptsTable.$inferSelect;
