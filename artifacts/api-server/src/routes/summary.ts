import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable, transactionsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userProvisioning";

const router = Router();

router.get("/summary", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);

  // Current month range
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .substring(0, 10);
  const monthEnd = now.toISOString().substring(0, 10);

  const [accounts, cats, monthTxs, recentTxs, allTxs] = await Promise.all([
    db.select().from(accountsTable).where(and(eq(accountsTable.userId, userId), eq(accountsTable.isActive, true))),
    db.select().from(categoriesTable),
    db.select().from(transactionsTable).where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, monthStart), lte(transactionsTable.date, monthEnd))),
    db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId)).orderBy(desc(transactionsTable.date)).limit(5),
    db.select({ id: transactionsTable.id }).from(transactionsTable).where(eq(transactionsTable.userId, userId)),
  ]);

  const catMap = new Map(cats.map((c) => [c.id, c]));

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance), 0);
  const totalIncome = monthTxs.filter((t) => t.type === "credit").reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalExpenses = monthTxs.filter((t) => t.type === "debit").reduce((s, t) => s + parseFloat(t.amount), 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Top spending categories this month
  const catTotals = new Map<number, number>();
  monthTxs
    .filter((t) => t.type === "debit" && t.categoryId != null)
    .forEach((t) => {
      const prev = catTotals.get(t.categoryId!) ?? 0;
      catTotals.set(t.categoryId!, prev + parseFloat(t.amount));
    });

  const topCategories = [...catTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([catId, total]) => {
      const cat = catMap.get(catId);
      return {
        categoryId: catId,
        categoryName: cat?.name ?? "Unknown",
        categoryColor: cat?.color ?? "#6B7280",
        categoryIcon: cat?.icon ?? "more-horizontal",
        totalAmount: Math.round(total * 100) / 100,
        percentage: totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0,
      };
    });

  const recentTransactions = recentTxs.map((tx) => ({
    ...tx,
    categoryName: tx.categoryId ? (catMap.get(tx.categoryId)?.name ?? null) : null,
    categoryColor: tx.categoryId ? (catMap.get(tx.categoryId)?.color ?? null) : null,
    categoryIcon: tx.categoryId ? (catMap.get(tx.categoryId)?.icon ?? null) : null,
  }));

  res.json({
    totalBalance: Math.round(totalBalance * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    savingsRate: Math.round(savingsRate * 100) / 100,
    topCategories,
    recentTransactions,
    accountCount: accounts.length,
    transactionCount: allTxs.length,
  });
});

export default router;
