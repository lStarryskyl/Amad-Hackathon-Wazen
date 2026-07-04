import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyCheckinsTable = pgTable("daily_checkins", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  checkinDate: text("checkin_date").notNull(),
  healthScore: integer("health_score").notNull().default(50),
  summary: text("summary").notNull().default(""),
  moodEmoji: text("mood_emoji").notNull().default("😐"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDailyCheckinSchema = createInsertSchema(dailyCheckinsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyCheckin = z.infer<typeof insertDailyCheckinSchema>;
export type DailyCheckin = typeof dailyCheckinsTable.$inferSelect;
