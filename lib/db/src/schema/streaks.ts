import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const streaksTable = pgTable("streaks", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  currentCount: integer("current_count").notNull().default(0),
  longestCount: integer("longest_count").notNull().default(0),
  lastDate: text("last_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStreakSchema = createInsertSchema(streaksTable).omit({ id: true, updatedAt: true });
export type InsertStreak = z.infer<typeof insertStreakSchema>;
export type Streak = typeof streaksTable.$inferSelect;
