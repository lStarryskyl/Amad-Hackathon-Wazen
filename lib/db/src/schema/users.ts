import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  name: text("name"),
  email: text("email"),
  hasConsented: boolean("has_consented").notNull().default(false),
  consentGivenAt: timestamp("consent_given_at"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  // Encrypted user-provided OpenAI API key (AES-256-GCM, stored as iv:authTag:ciphertext)
  encryptedOpenAiKey: text("encrypted_openai_key"),
  // Updated each time the user makes an authenticated request — used by the
  // orphan-cleanup job to skip recently-active accounts before querying Clerk.
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
