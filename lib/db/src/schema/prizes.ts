import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const prizesTable = pgTable("prizes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  imageUrl: text("image_url"),
  icon: text("icon"),
  requiredStars: integer("required_stars").notNull().default(0),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Prize = typeof prizesTable.$inferSelect;
export type InsertPrize = typeof prizesTable.$inferInsert;
