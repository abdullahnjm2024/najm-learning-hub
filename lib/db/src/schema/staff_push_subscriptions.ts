import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { staffTable } from "./staff";

export const staffPushSubscriptionsTable = pgTable("staff_push_subscriptions", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => staffTable.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type StaffPushSubscription = typeof staffPushSubscriptionsTable.$inferSelect;
