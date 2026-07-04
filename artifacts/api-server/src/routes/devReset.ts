import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  accountsTable,
  transactionsTable,
  goalsTable,
  alertsTable,
  consentRecordsTable,
  recurringObligationsTable,
  regretScoresTable,
  rescuePlansTable,
  moneyStoriesTable,
  simulationRunsTable,
  guardrailsTable,
  streaksTable,
  achievementsTable,
  dailyCheckinsTable,
  pushTokensTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import pino from "pino";

const logger = pino({ name: "dev-reset" });
const router = Router();

if (process.env.NODE_ENV !== "production") {
  router.post("/dev/reset", requireAuth, async (req, res) => {
    const userId = (req as any).userId as string;
    logger.warn({ userId }, "DEV RESET: wiping all data for user");

    try {
      await db.delete(simulationRunsTable).where(eq(simulationRunsTable.userId, userId));
      await db.delete(moneyStoriesTable).where(eq(moneyStoriesTable.userId, userId));
      await db.delete(rescuePlansTable).where(eq(rescuePlansTable.userId, userId));
      await db.delete(regretScoresTable).where(eq(regretScoresTable.userId, userId));
      await db.delete(alertsTable).where(eq(alertsTable.userId, userId));
      await db.delete(achievementsTable).where(eq(achievementsTable.userId, userId));
      await db.delete(streaksTable).where(eq(streaksTable.userId, userId));
      await db.delete(dailyCheckinsTable).where(eq(dailyCheckinsTable.userId, userId));
      await db.delete(guardrailsTable).where(eq(guardrailsTable.userId, userId));
      await db.delete(pushTokensTable).where(eq(pushTokensTable.userId, userId));
      await db.delete(goalsTable).where(eq(goalsTable.userId, userId));
      await db.delete(transactionsTable).where(eq(transactionsTable.userId, userId));
      await db.delete(accountsTable).where(eq(accountsTable.userId, userId));
      await db.delete(recurringObligationsTable).where(eq(recurringObligationsTable.userId, userId));
      await db.delete(consentRecordsTable).where(eq(consentRecordsTable.userId, userId));
      await db.delete(usersTable).where(eq(usersTable.id, userId));

      logger.warn({ userId }, "DEV RESET: complete");
      res.json({
        ok: true,
        message: "All data wiped. Sign out and back in to restart the full onboarding flow.",
      });
    } catch (err: any) {
      logger.error({ err, userId }, "DEV RESET: failed");
      res.status(500).json({ error: err.message });
    }
  });
}

export default router;
