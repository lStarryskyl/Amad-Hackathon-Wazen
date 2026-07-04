import { pgTable, text, serial, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recurringObligationsTable = pgTable("recurring_obligations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  // 'weekly' | 'monthly' | 'yearly'
  frequency: text("frequency").notNull().default("monthly"),
  nextDueDate: text("next_due_date"),
  categoryId: integer("category_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRecurringObligationSchema = createInsertSchema(recurringObligationsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertRecurringObligation = z.infer<typeof insertRecurringObligationSchema>;
export type RecurringObligation = typeof recurringObligationsTable.$inferSelect;
