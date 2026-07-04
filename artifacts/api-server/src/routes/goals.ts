import { Router } from "express";
import { db } from "@workspace/db";
import { goalsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userProvisioning";
import type { Goal } from "@workspace/db";

const router = Router();

function formatGoal(goal: Goal) {
  const target = parseFloat(goal.targetAmount);
  const current = parseFloat(goal.currentAmount);
  return {
    ...goal,
    progressPercent: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
  };
}

router.get("/goals", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);
  const goals = await db.select().from(goalsTable).where(eq(goalsTable.userId, userId));
  res.json(goals.map(formatGoal));
});

router.post("/goals", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { name, targetAmount, currentAmount, targetDate, category } = req.body as {
    name: string;
    targetAmount: string;
    currentAmount?: string;
    targetDate?: string;
    category?: string;
  };

  const [goal] = await db
    .insert(goalsTable)
    .values({
      userId,
      name,
      targetAmount,
      currentAmount: currentAmount ?? "0",
      targetDate: targetDate ?? null,
      category: category ?? "savings",
    })
    .returning();

  res.status(201).json(formatGoal(goal));
});

router.get("/goals/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = parseInt(req.params.id, 10);
  const [goal] = await db
    .select()
    .from(goalsTable)
    .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, userId)));
  if (!goal) return res.status(404).json({ error: "Not found", message: "Goal not found" });
  res.json(formatGoal(goal));
});

router.put("/goals/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = parseInt(req.params.id, 10);
  const { name, targetAmount, currentAmount, targetDate, category, status } = req.body as {
    name?: string;
    targetAmount?: string;
    currentAmount?: string;
    targetDate?: string | null;
    category?: string;
    status?: string;
  };

  const [goal] = await db
    .update(goalsTable)
    .set({ name, targetAmount, currentAmount, targetDate, category, status, updatedAt: new Date() })
    .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, userId)))
    .returning();

  if (!goal) return res.status(404).json({ error: "Not found", message: "Goal not found" });
  res.json(formatGoal(goal));
});

router.delete("/goals/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = parseInt(req.params.id, 10);
  await db.delete(goalsTable).where(and(eq(goalsTable.id, id), eq(goalsTable.userId, userId)));
  res.status(204).send();
});

export default router;
