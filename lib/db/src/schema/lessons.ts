import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accessLevelEnum = pgEnum("access_level", ["free", "paid"]);

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleAr: text("title_ar").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  youtubeUrl: text("youtube_url"),
  gradeLevel: text("grade_level").notNull().default(""),
  accessLevel: accessLevelEnum("access_level").notNull().default("free"),
  section: text("section"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  unitId: integer("unit_id"),
  audioUrl: text("audio_url"),
  imageUrl: text("image_url"),
  richText: text("rich_text"),
  richTextAr: text("rich_text_ar"),
  quizId: integer("quiz_id"),
  pdfUrl: text("pdf_url"),
});

export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true, createdAt: true });
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessonsTable.$inferSelect;
