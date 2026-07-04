import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const consentRecordsTable = pgTable("consent_records", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  version: text("version").notNull().default("1.0"),
  acceptedAt: timestamp("accepted_at").notNull().defaultNow(),
});

export const insertConsentRecordSchema = createInsertSchema(consentRecordsTable).omit({
  id: true,
  acceptedAt: true,
});

export type InsertConsentRecord = z.infer<typeof insertConsentRecordSchema>;
export type ConsentRecord = typeof consentRecordsTable.$inferSelect;
