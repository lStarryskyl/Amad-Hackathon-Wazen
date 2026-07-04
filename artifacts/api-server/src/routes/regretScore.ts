import { Router } from "express";
import { db } from "@workspace/db";
import { regretScoresTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireConsent } from "../middlewares/requireConsent";
import { getOrCreateUser } from "../lib/userProvisioning";
import { computeRegretScore } from "../lib/financialIntelligence";

const router = Router();

router.get("/regret-score", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);

  // Check if we have a fresh score (< 1 hour old)
  const [cached] = await db
    .select()
    .from(regretScoresTable)
    .where(eq(regretScoresTable.userId, userId))
    .orderBy(desc(regretScoresTable.computedAt))
    .limit(1);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (cached && new Date(cached.computedAt) > oneHourAgo) {
    res.json({
      score: cached.score,
      level: cached.level,
      factors: cached.factors as any[],
      computedAt: cached.computedAt.toISOString(),
    });
    return;
  }

  const result = await computeRegretScore(userId);

  await db.insert(regretScoresTable).values({
    userId,
    score: result.score,
    level: result.level,
    factors: result.factors as any,
  });

  res.json(result);
});

export default router;
