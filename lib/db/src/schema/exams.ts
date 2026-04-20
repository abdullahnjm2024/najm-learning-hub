import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const examsTable = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleAr: text("title_ar").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  googleFormUrl: text("google_form_url").notNull(),
  gradeLevel: text("grade_level").notNull(),
  accessLevel: text("access_level").notNull().default("free"),
  maxScore: integer("max_score").notNull().default(100),
  starsReward: integer("stars_reward").notNull().default(10),
  quizCode: text("quiz_code").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExamSchema = createInsertSchema(examsTable).omit({ id: true, createdAt: true });
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof examsTable.$inferSelect;
