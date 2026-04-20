import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const unitsTable = pgTable("units", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull(),
  title: text("title").notNull(),
  titleAr: text("title_ar").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Unit = typeof unitsTable.$inferSelect;
export type InsertUnit = typeof unitsTable.$inferInsert;
