import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const subjectsTable = pgTable("subjects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleAr: text("title_ar").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  gradeLevel: text("grade_level").notNull(),
  accessLevel: text("access_level").notNull().default("free"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Subject = typeof subjectsTable.$inferSelect;
export type InsertSubject = typeof subjectsTable.$inferInsert;
