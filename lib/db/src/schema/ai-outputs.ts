import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const regretScoresTable = pgTable("regret_scores", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  score: integer("score").notNull(), // 0–100
  // 'low' | 'medium' | 'high'
  level: text("level").notNull(),
  factors: jsonb("factors"), // JSON array of factor objects
  computedAt: timestamp("computed_at").notNull().defaultNow(),
});

export const rescuePlansTable = pgTable("rescue_plans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  riskLevel: text("risk_level").notNull(),
  actions: jsonb("actions").notNull(), // JSON array of action objects
  narrative: text("narrative"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const moneyStoriesTable = pgTable("money_stories", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  periodLabel: text("period_label").notNull(),
  narrative: text("narrative").notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const simulationRunsTable = pgTable("simulation_runs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  scenarioName: text("scenario_name").notNull(),
  inputs: jsonb("inputs").notNull(), // JSON object
  results: jsonb("results"), // JSON object
  narrative: text("narrative"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type RegretScore = typeof regretScoresTable.$inferSelect;
export type RescuePlan = typeof rescuePlansTable.$inferSelect;
export type MoneyStory = typeof moneyStoriesTable.$inferSelect;
export type SimulationRun = typeof simulationRunsTable.$inferSelect;
