import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireConsent } from "../middlewares/requireConsent";
import { getOrCreateUser } from "../lib/userProvisioning";

const router = Router();

router.get("/transactions", requireAuth, requireConsent, async (req, res) => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);

  const { accountId, categoryId, startDate, endDate } = req.query as Record<string, string | undefined>;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const conditions = [eq(transactionsTable.userId, userId)];
  if (accountId) conditions.push(eq(transactionsTable.accountId, parseInt(accountId, 10)));
  if (categoryId) conditions.push(eq(transactionsTable.categoryId, parseInt(categoryId, 10)));
  if (startDate) conditions.push(gte(transactionsTable.date, startDate));
  if (endDate) conditions.push(lte(transactionsTable.date, endDate));

  const [items, cats, all] = await Promise.all([
    db.select().from(transactionsTable).where(and(...conditions)).orderBy(desc(transactionsTable.date)).limit(limit).offset(offset),
    db.select().from(categoriesTable),
    db.select({ id: transactionsTable.id }).from(transactionsTable).where(and(...conditions)),
  ]);

  const catMap = new Map(cats.map((c) => [c.id, c]));

  const enriched = items.map((tx) => ({
    ...tx,
    categoryName: tx.categoryId ? (catMap.get(tx.categoryId)?.name ?? null) : null,
    categoryColor: tx.categoryId ? (catMap.get(tx.categoryId)?.color ?? null) : null,
    categoryIcon: tx.categoryId ? (catMap.get(tx.categoryId)?.icon ?? null) : null,
  }));

  res.json({ items: enriched, total: all.length, limit, offset });
});

export default router;
