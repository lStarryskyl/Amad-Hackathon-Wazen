import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guardrailsTable = pgTable("guardrails", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  categoryName: text("category_name").notNull(),
  period: text("period").notNull().default("monthly"),
  limitAmount: numeric("limit_amount", { precision: 12, scale: 2 }).notNull(),
  color: text("color").notNull().default("#6366f1"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGuardrailSchema = createInsertSchema(guardrailsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGuardrail = z.infer<typeof insertGuardrailSchema>;
export type Guardrail = typeof guardrailsTable.$inferSelect;
