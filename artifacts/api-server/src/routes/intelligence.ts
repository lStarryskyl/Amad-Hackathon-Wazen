import { Router } from "express";
import { db } from "@workspace/db";
import {
  regretScoresTable,
  rescuePlansTable,
  moneyStoriesTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireConsent } from "../middlewares/requireConsent";
import { getOrCreateUser } from "../lib/userProvisioning";
import { computeRegretScore, buildRescueActions, buildMoneyStoryContext } from "../lib/financialIntelligence";
import { generateRescueNarrative, generateMoneyStory } from "../lib/aiOrchestration";

const router = Router();

// GET /ai/regret-score — compute, persist, and return current regret score
router.get("/ai/regret-score", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);

  try {
    const result = await computeRegretScore(userId);

    const [saved] = await db.insert(regretScoresTable).values({
      userId,
      score: result.score,
      level: result.level,
      factors: result.factors as any,
    }).returning();

    res.json({
      id: saved.id,
      score: result.score,
      level: result.level,
      factors: result.factors,
      summary: result.summary,
      safeZoneBalance: result.safeZoneBalance,
      monthlyIncome: result.monthlyIncome,
      monthlyExpenses: result.monthlyExpenses,
      savingsRate: result.savingsRate,
      spendingVelocityRatio: result.spendingVelocityRatio,
      recurringBurdenPct: result.recurringBurdenPct,
      computedAt: saved.computedAt,
    });
  } catch (err) {
    console.error("regret-score error", err);
    res.status(500).json({ error: "InternalError", message: "Failed to compute regret score" });
  }
});

// GET /ai/regret-score/history — last 10 scores
router.get("/ai/regret-score/history", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const history = await db
    .select()
    .from(regretScoresTable)
    .where(eq(regretScoresTable.userId, userId))
    .orderBy(desc(regretScoresTable.computedAt))
    .limit(10);

  res.json(history);
});

// POST /ai/rescue-plan — generate deterministic actions + LLM narrative
router.post("/ai/rescue-plan", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);

  try {
    const scoreResult = await computeRegretScore(userId);
    const actions = await buildRescueActions(userId, scoreResult);
    const narrative = await generateRescueNarrative(userId, scoreResult.level, actions, {
      savingsRate: scoreResult.savingsRate,
      spendingVelocityRatio: scoreResult.spendingVelocityRatio,
      recurringBurdenPct: scoreResult.recurringBurdenPct,
    });

    const [saved] = await db.insert(rescuePlansTable).values({
      userId,
      riskLevel: scoreResult.level,
      actions: actions as any,
      narrative,
    }).returning();

    res.json({
      id: saved.id,
      riskLevel: saved.riskLevel,
      actions,
      narrative,
      score: scoreResult.score,
      generatedAt: saved.generatedAt,
    });
  } catch (err) {
    console.error("rescue-plan error", err);
    res.status(500).json({ error: "InternalError", message: "Failed to generate rescue plan" });
  }
});

// GET /ai/rescue-plan/latest — most recent rescue plan
router.get("/ai/rescue-plan/latest", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const [plan] = await db
    .select()
    .from(rescuePlansTable)
    .where(eq(rescuePlansTable.userId, userId))
    .orderBy(desc(rescuePlansTable.generatedAt))
    .limit(1);

  if (!plan) {
    res.status(404).json({ error: "NotFound", message: "No rescue plan found. Generate one first." });
    return;
  }

  res.json(plan);
});

// POST /ai/money-story — generate and persist money story
router.post("/ai/money-story", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);

  try {
    const context = await buildMoneyStoryContext(userId);
    const latestMonth = context.months[context.months.length - 1];
    const periodLabel = latestMonth?.label ?? new Date().toLocaleString("default", { month: "long", year: "numeric" });
    const signals: Record<string, unknown> = {
      monthlyBreakdowns: context.months.map((m) => ({
        month: m.label,
        income: m.income,
        expenses: m.expenses,
        savingsRate: m.savingsRate,
        topCategories: Object.entries(m.topCategories).map(([name, amount]) => ({ name, amount })),
      })),
      totalBalance: context.months.reduce((s, m) => s + m.income - m.expenses, 0),
      recurringObligationsTotal: latestMonth?.recurringObligationCount ?? 0,
    };
    const narrative = await generateMoneyStory(userId, periodLabel, signals);

    const [saved] = await db.insert(moneyStoriesTable).values({
      userId,
      periodLabel,
      narrative,
    }).returning();

    res.json({
      id: saved.id,
      periodLabel: saved.periodLabel,
      narrative: saved.narrative,
      signals,
      generatedAt: saved.generatedAt,
    });
  } catch (err) {
    console.error("money-story error", err);
    res.status(500).json({ error: "InternalError", message: "Failed to generate money story" });
  }
});

// GET /ai/money-story/latest — most recent money story
router.get("/ai/money-story/latest", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const [story] = await db
    .select()
    .from(moneyStoriesTable)
    .where(eq(moneyStoriesTable.userId, userId))
    .orderBy(desc(moneyStoriesTable.generatedAt))
    .limit(1);

  if (!story) {
    res.status(404).json({ error: "NotFound", message: "No money story found. Generate one first." });
    return;
  }

  res.json(story);
});

export default router;
