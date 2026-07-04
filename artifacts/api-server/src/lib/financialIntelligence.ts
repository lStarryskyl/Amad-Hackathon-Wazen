import { db } from "@workspace/db";
import { transactionsTable, accountsTable, goalsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface RegretFactor {
  key: string;
  label: string;
  description: string;
  impact: number;
}

export interface RegretScoreResult {
  score: number;
  level: "low" | "medium" | "high";
  factors: RegretFactor[];
  computedAt: string;
}

export interface RescueAction {
  title: string;
  description: string;
  estimatedSaving: number;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  icon: string;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().substring(0, 10);
}

function today(): string {
  return new Date().toISOString().substring(0, 10);
}

function monthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
}

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().substring(0, 10);
}

export async function computeRegretScore(userId: string): Promise<RegretScoreResult> {
  const now = today();
  const weekStart = daysAgo(7);
  const monthBegin = monthStart();
  const twoMonthsAgo = monthsAgo(2);

  const [allAccounts, recentTxs, monthTxs, historicalTxs, goals, categories] = await Promise.all([
    db.select().from(accountsTable).where(and(eq(accountsTable.userId, userId), eq(accountsTable.isActive, true))),
    db.select().from(transactionsTable).where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, weekStart), lte(transactionsTable.date, now))),
    db.select().from(transactionsTable).where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, monthBegin), lte(transactionsTable.date, now))),
    db.select().from(transactionsTable).where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, twoMonthsAgo), lte(transactionsTable.date, monthBegin))),
    db.select().from(goalsTable).where(and(eq(goalsTable.userId, userId), eq(goalsTable.status, "active"))),
    db.select().from(categoriesTable),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  let score = 0;
  const factors: RegretFactor[] = [];

  // ── Factor 1: Spending velocity (0–30 pts)
  const weekDebits = recentTxs.filter((t) => t.type === "debit").reduce((s, t) => s + parseFloat(t.amount), 0);
  const historicalDebits = historicalTxs.filter((t) => t.type === "debit").reduce((s, t) => s + parseFloat(t.amount), 0);
  const weeksInHistory = Math.max(1, historicalTxs.length > 0 ? 8 : 1);
  const avgWeeklySpend = historicalDebits / weeksInHistory;
  let velocityImpact = 0;
  if (avgWeeklySpend > 0) {
    const ratio = weekDebits / avgWeeklySpend;
    if (ratio > 2.0) velocityImpact = 30;
    else if (ratio > 1.5) velocityImpact = 20;
    else if (ratio > 1.2) velocityImpact = 10;
  }
  if (velocityImpact > 0) {
    score += velocityImpact;
    factors.push({
      key: "spending_velocity",
      label: "Spending Spike",
      description: `You've spent $${weekDebits.toFixed(0)} this week — significantly above your typical pace.`,
      impact: velocityImpact,
    });
  }

  // ── Factor 2: Monthly savings rate (0–20 pts)
  const monthIncome = monthTxs.filter((t) => t.type === "credit").reduce((s, t) => s + parseFloat(t.amount), 0);
  const monthExpenses = monthTxs.filter((t) => t.type === "debit").reduce((s, t) => s + parseFloat(t.amount), 0);
  const savingsRate = monthIncome > 0 ? (monthIncome - monthExpenses) / monthIncome : -1;
  let savingsImpact = 0;
  if (savingsRate < 0) savingsImpact = 20;
  else if (savingsRate < 0.05) savingsImpact = 15;
  else if (savingsRate < 0.15) savingsImpact = 8;
  if (savingsImpact > 0) {
    score += savingsImpact;
    factors.push({
      key: "low_savings_rate",
      label: "Low Savings Rate",
      description: savingsRate < 0
        ? "You're spending more than you're earning this month."
        : `Your savings rate is only ${(savingsRate * 100).toFixed(0)}% — below the healthy 15% target.`,
      impact: savingsImpact,
    });
  }

  // ── Factor 3: Discretionary spending ratio (0–25 pts)
  const discretionaryNames = ["dining", "restaurants", "entertainment", "shopping", "clothing", "bars", "recreation"];
  const discretionaryCatIds = categories.filter((c) => discretionaryNames.some((n) => c.name.toLowerCase().includes(n))).map((c) => c.id);
  const discretionaryTotal = monthTxs
    .filter((t) => t.type === "debit" && t.categoryId != null && discretionaryCatIds.includes(t.categoryId))
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const discretionaryRatio = monthExpenses > 0 ? discretionaryTotal / monthExpenses : 0;
  let discretionaryImpact = 0;
  if (discretionaryRatio > 0.5) discretionaryImpact = 25;
  else if (discretionaryRatio > 0.35) discretionaryImpact = 15;
  else if (discretionaryRatio > 0.2) discretionaryImpact = 8;
  if (discretionaryImpact > 0) {
    score += discretionaryImpact;
    factors.push({
      key: "discretionary_ratio",
      label: "High Discretionary Spending",
      description: `${(discretionaryRatio * 100).toFixed(0)}% of your expenses are on dining, entertainment & shopping.`,
      impact: discretionaryImpact,
    });
  }

  // ── Factor 4: Goal trajectory (0–15 pts)
  let goalImpact = 0;
  const behindGoals = goals.filter((g) => {
    if (!g.targetDate) return false;
    const target = parseFloat(g.targetAmount);
    const current = parseFloat(g.currentAmount);
    const created = new Date(g.createdAt).getTime();
    const due = new Date(g.targetDate).getTime();
    const now_ = Date.now();
    const totalTime = due - created;
    if (totalTime <= 0) return false;
    const elapsed = now_ - created;
    const expectedProgress = elapsed / totalTime;
    const actualProgress = target > 0 ? current / target : 1;
    return actualProgress < expectedProgress * 0.75; // more than 25% behind
  });
  if (behindGoals.length > 0) {
    goalImpact = Math.min(15, behindGoals.length * 7);
    score += goalImpact;
    factors.push({
      key: "goal_trajectory",
      label: "Behind on Goals",
      description: `${behindGoals.length} of your goal${behindGoals.length > 1 ? "s are" : " is"} behind schedule.`,
      impact: goalImpact,
    });
  }

  // ── Factor 5: Large one-off transaction (0–10 pts)
  const last3Days = recentTxs.filter((t) => t.date >= daysAgo(3));
  const avgDailySpend = historicalDebits / 60;
  const largeTx = last3Days.filter((t) => t.type === "debit" && parseFloat(t.amount) > Math.max(50, avgDailySpend * 2));
  if (largeTx.length > 0) {
    const impactPts = 10;
    score += impactPts;
    const biggest = largeTx.reduce((max, t) => parseFloat(t.amount) > parseFloat(max.amount) ? t : max, largeTx[0]);
    factors.push({
      key: "large_transaction",
      label: "Large Recent Purchase",
      description: `A $${parseFloat(biggest.amount).toFixed(0)} purchase at "${biggest.merchantName || biggest.description}" is outside your normal pattern.`,
      impact: impactPts,
    });
  }

  score = Math.min(100, score);
  const level: "low" | "medium" | "high" = score <= 30 ? "low" : score <= 60 ? "medium" : "high";

  return {
    score,
    level,
    factors,
    computedAt: new Date().toISOString(),
  };
}

export function buildRescueActions(score: RegretScoreResult, monthlyExpenses: number): RescueAction[] {
  const actions: RescueAction[] = [];

  for (const f of score.factors) {
    if (f.key === "spending_velocity") {
      actions.push({
        title: "Declare a Spending Pause",
        description: "Freeze all non-essential purchases for the next 5 days. Use what you have.",
        estimatedSaving: Math.round(monthlyExpenses * 0.08),
        difficulty: "easy",
        category: "habit",
        icon: "pause-circle",
      });
    }
    if (f.key === "low_savings_rate") {
      actions.push({
        title: "Auto-Transfer to Savings",
        description: "Set up an automatic transfer of 10% of your next paycheck to your savings account the same day it arrives.",
        estimatedSaving: Math.round(monthlyExpenses * 0.1),
        difficulty: "easy",
        category: "savings",
        icon: "arrow-right-circle",
      });
    }
    if (f.key === "discretionary_ratio") {
      actions.push({
        title: "Cut Dining Out by Half",
        description: "Cook at home for the next 2 weeks. This single change typically saves $150–$300/month.",
        estimatedSaving: Math.round(monthlyExpenses * 0.12),
        difficulty: "medium",
        category: "food",
        icon: "coffee",
      });
      actions.push({
        title: "Pause One Subscription",
        description: "Review streaming and app subscriptions. Cancel or pause the one you use least.",
        estimatedSaving: 15,
        difficulty: "easy",
        category: "entertainment",
        icon: "x-circle",
      });
    }
    if (f.key === "goal_trajectory") {
      actions.push({
        title: "Redirect Discretionary Budget to Goals",
        description: "Redirect $100 from entertainment and dining into your goal fund this month.",
        estimatedSaving: 100,
        difficulty: "medium",
        category: "goals",
        icon: "target",
      });
    }
    if (f.key === "large_transaction") {
      actions.push({
        title: "Apply the 48-Hour Rule",
        description: "For any purchase over $50, wait 48 hours before buying. You'll skip ~40% of them.",
        estimatedSaving: Math.round(monthlyExpenses * 0.05),
        difficulty: "easy",
        category: "habit",
        icon: "clock",
      });
    }
  }

  if (actions.length === 0) {
    // Safe zone — still offer optimizations
    actions.push({
      title: "Boost Your Emergency Fund",
      description: "You're in good shape. Bump savings contributions by 5% to strengthen your buffer.",
      estimatedSaving: Math.round(monthlyExpenses * 0.05),
      difficulty: "easy",
      category: "savings",
      icon: "shield",
    });
    actions.push({
      title: "Invest the Surplus",
      description: "Move any month-end surplus over $200 into an index fund or high-yield savings.",
      estimatedSaving: 0,
      difficulty: "medium",
      category: "investing",
      icon: "trending-up",
    });
  }

  return actions.slice(0, 4);
}
