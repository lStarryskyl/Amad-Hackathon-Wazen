import { db } from "@workspace/db";
import {
  transactionsTable,
  accountsTable,
  recurringObligationsTable,
  categoriesTable,
} from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface RegretFactor {
  key: string;
  label: string;
  description: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
}

export interface RegretScoreResult {
  score: number;
  level: "low" | "medium" | "high";
  factors: RegretFactor[];
  summary: string;
  safeZoneBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  spendingVelocityRatio: number;
  recurringBurdenPct: number;
}

export interface RescueAction {
  id: string;
  priority: number;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: string;
  estimatedSaving?: number;
  tag: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateRange(monthsAgo: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
  return {
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

function currentMonthRange() {
  const now = new Date();
  const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const end = now.toISOString().substring(0, 10);
  return { start, end };
}

export async function computeRegretScore(userId: string): Promise<RegretScoreResult> {
  const now = currentMonthRange();
  const prev = dateRange(1);

  const [accounts, recurringObs, catRows, currentTxs, prevTxs] = await Promise.all([
    db.select().from(accountsTable).where(and(eq(accountsTable.userId, userId), eq(accountsTable.isActive, true))),
    db.select().from(recurringObligationsTable).where(and(eq(recurringObligationsTable.userId, userId), eq(recurringObligationsTable.isActive, true))),
    db.select().from(categoriesTable),
    db.select().from(transactionsTable).where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, now.start), lte(transactionsTable.date, now.end))),
    db.select().from(transactionsTable).where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, prev.start), lte(transactionsTable.date, prev.end))),
  ]);

  const catMap = new Map(catRows.map((c) => [c.id, c]));

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance), 0);
  const liquidBalance = accounts
    .filter((a) => a.accountType === "checking" || a.accountType === "savings")
    .reduce((s, a) => s + parseFloat(a.balance), 0);

  const currentIncome = currentTxs.filter((t) => t.type === "credit").reduce((s, t) => s + parseFloat(t.amount), 0);
  const currentExpenses = currentTxs.filter((t) => t.type === "debit").reduce((s, t) => s + parseFloat(t.amount), 0);
  const prevIncome = prevTxs.filter((t) => t.type === "credit").reduce((s, t) => s + parseFloat(t.amount), 0);
  const prevExpenses = prevTxs.filter((t) => t.type === "debit").reduce((s, t) => s + parseFloat(t.amount), 0);

  const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome) * 100 : 0;

  const monthlyRecurring = recurringObs.reduce((s, o) => {
    const amt = parseFloat(o.amount);
    if (o.frequency === "weekly") return s + amt * 4.33;
    if (o.frequency === "yearly") return s + amt / 12;
    return s + amt;
  }, 0);

  const estimatedMonthlyIncome = currentIncome > 0 ? currentIncome : prevIncome || 4800;
  const recurringBurdenPct = estimatedMonthlyIncome > 0 ? (monthlyRecurring / estimatedMonthlyIncome) * 100 : 0;

  const spendingVelocityRatio = prevExpenses > 0 ? currentExpenses / prevExpenses : 1;

  const currentDiscretionary = currentTxs
    .filter((t) => {
      if (t.type !== "debit" || !t.categoryId) return false;
      const cat = catMap.get(t.categoryId);
      return cat && ["Food & Dining", "Entertainment", "Shopping", "Personal Care"].includes(cat.name);
    })
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  const prevDiscretionary = prevTxs
    .filter((t) => {
      if (t.type !== "debit" || !t.categoryId) return false;
      const cat = catMap.get(t.categoryId);
      return cat && ["Food & Dining", "Entertainment", "Shopping", "Personal Care"].includes(cat.name);
    })
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  const discretionarySpike = prevDiscretionary > 0 ? currentDiscretionary / prevDiscretionary : 1;

  const safeZoneBalance = estimatedMonthlyIncome * 1.5;
  const balanceSafetyRatio = liquidBalance / Math.max(safeZoneBalance, 1);

  // Score components (each 0–100, weighted)
  let score = 0;
  const factors: RegretFactor[] = [];

  // 1. Savings rate (weight 30)
  const savingsScore = Math.max(0, Math.min(100, (30 - savingsRate) * 3.33));
  score += savingsScore * 0.3;
  factors.push({
    key: "savings_rate",
    label: "Savings Rate",
    description: savingsRate >= 20
      ? `You're saving ${savingsRate.toFixed(0)}% of income — excellent discipline.`
      : savingsRate >= 10
      ? `Your savings rate is ${savingsRate.toFixed(0)}% — there's room to grow.`
      : `Savings rate is ${savingsRate.toFixed(0)}% — below the recommended 20%.`,
    impact: savingsRate >= 20 ? "positive" : savingsRate >= 10 ? "neutral" : "negative",
    weight: 0.3,
  });

  // 2. Spending velocity (weight 25)
  const velocityScore = Math.max(0, Math.min(100, (spendingVelocityRatio - 0.8) * 125));
  score += velocityScore * 0.25;
  factors.push({
    key: "spending_velocity",
    label: "Spending Velocity",
    description: spendingVelocityRatio <= 0.9
      ? `You're spending ${Math.round((1 - spendingVelocityRatio) * 100)}% less than last month.`
      : spendingVelocityRatio <= 1.1
      ? "Your spending pace matches last month."
      : `You're spending ${Math.round((spendingVelocityRatio - 1) * 100)}% more than last month.`,
    impact: spendingVelocityRatio <= 0.95 ? "positive" : spendingVelocityRatio <= 1.1 ? "neutral" : "negative",
    weight: 0.25,
  });

  // 3. Recurring burden (weight 20)
  const burdenScore = Math.max(0, Math.min(100, (recurringBurdenPct - 30) * 2.5));
  score += burdenScore * 0.2;
  factors.push({
    key: "recurring_burden",
    label: "Recurring Obligations",
    description: recurringBurdenPct <= 35
      ? `Fixed costs are ${recurringBurdenPct.toFixed(0)}% of income — healthy range.`
      : recurringBurdenPct <= 50
      ? `Fixed costs are ${recurringBurdenPct.toFixed(0)}% of income — watch this.`
      : `Fixed costs are ${recurringBurdenPct.toFixed(0)}% of income — leaving little flexibility.`,
    impact: recurringBurdenPct <= 35 ? "positive" : recurringBurdenPct <= 50 ? "neutral" : "negative",
    weight: 0.2,
  });

  // 4. Balance safety buffer (weight 15)
  const bufferScore = Math.max(0, Math.min(100, (1 - balanceSafetyRatio) * 100));
  score += bufferScore * 0.15;
  factors.push({
    key: "balance_buffer",
    label: "Safety Buffer",
    description: balanceSafetyRatio >= 1.5
      ? `Your liquid balance covers ${(balanceSafetyRatio * 1.5).toFixed(1)} months of expenses — well buffered.`
      : balanceSafetyRatio >= 1
      ? `Your balance covers about ${balanceSafetyRatio.toFixed(1)} months of typical expenses.`
      : `Your liquid balance is below your safe-zone threshold.`,
    impact: balanceSafetyRatio >= 1.5 ? "positive" : balanceSafetyRatio >= 1 ? "neutral" : "negative",
    weight: 0.15,
  });

  // 5. Discretionary spike (weight 10)
  const spikeScore = Math.max(0, Math.min(100, (discretionarySpike - 0.9) * 100));
  score += spikeScore * 0.1;
  factors.push({
    key: "discretionary_spike",
    label: "Discretionary Spending",
    description: discretionarySpike <= 1.0
      ? "Discretionary spending is on track with last month."
      : discretionarySpike <= 1.2
      ? `Dining/entertainment up ${Math.round((discretionarySpike - 1) * 100)}% vs last month — minor overage.`
      : `Discretionary spending is up ${Math.round((discretionarySpike - 1) * 100)}% vs last month — review your habits.`,
    impact: discretionarySpike <= 1.0 ? "positive" : discretionarySpike <= 1.2 ? "neutral" : "negative",
    weight: 0.1,
  });

  score = Math.round(Math.max(0, Math.min(100, score)));

  const level: "low" | "medium" | "high" = score < 30 ? "low" : score < 60 ? "medium" : "high";

  const summary =
    level === "low"
      ? "Your finances look healthy. Keep up the great habits!"
      : level === "medium"
      ? "A few areas need attention. Review the factors below to stay on track."
      : "Elevated financial risk detected. Take action on the recommendations below.";

  return {
    score,
    level,
    factors,
    summary,
    safeZoneBalance: Math.round(safeZoneBalance * 100) / 100,
    monthlyIncome: Math.round(estimatedMonthlyIncome * 100) / 100,
    monthlyExpenses: Math.round(currentExpenses * 100) / 100,
    savingsRate: Math.round(savingsRate * 100) / 100,
    spendingVelocityRatio: Math.round(spendingVelocityRatio * 100) / 100,
    recurringBurdenPct: Math.round(recurringBurdenPct * 100) / 100,
  };
}

export async function buildRescueActions(userId: string, scoreResult: RegretScoreResult): Promise<RescueAction[]> {
  const actions: RescueAction[] = [];
  const {
    savingsRate,
    spendingVelocityRatio,
    recurringBurdenPct,
    monthlyIncome,
    monthlyExpenses,
  } = scoreResult;

  if (savingsRate < 15 && monthlyIncome > 0) {
    const targetSavings = Math.round(monthlyIncome * 0.15 - Math.max(0, monthlyIncome - monthlyExpenses));
    actions.push({
      id: "boost_savings",
      priority: 1,
      title: "Automate a Savings Transfer",
      description: `Set up an automatic transfer of $${Math.max(50, targetSavings).toFixed(0)}/month to savings on payday so the money moves before you can spend it.`,
      impact: "high",
      category: "savings",
      estimatedSaving: Math.max(50, targetSavings),
      tag: "💰 Savings",
    });
  }

  if (recurringBurdenPct > 45) {
    const obligations = await db
      .select()
      .from(recurringObligationsTable)
      .where(and(eq(recurringObligationsTable.userId, userId), eq(recurringObligationsTable.isActive, true)))
      .orderBy(desc(recurringObligationsTable.amount));
    const smallSubs = obligations
      .filter((o) => parseFloat(o.amount) < 25)
      .reduce((s, o) => s + parseFloat(o.amount), 0);
    actions.push({
      id: "audit_subscriptions",
      priority: 2,
      title: "Audit Subscriptions",
      description: `Your fixed costs are ${recurringBurdenPct.toFixed(0)}% of income. You have $${smallSubs.toFixed(0)}/month in small subscriptions — review each and cancel unused ones.`,
      impact: "medium",
      category: "subscriptions",
      estimatedSaving: Math.round(smallSubs * 0.5),
      tag: "✂️ Cut Costs",
    });
  }

  if (spendingVelocityRatio > 1.15) {
    const overspend = Math.round((monthlyExpenses * (1 - 1 / spendingVelocityRatio)));
    actions.push({
      id: "reduce_velocity",
      priority: 3,
      title: "Pause Non-Essential Spending",
      description: `You're spending ${Math.round((spendingVelocityRatio - 1) * 100)}% more than last month — about $${overspend} in extra spending. Try a 3-day spending pause to reset your baseline.`,
      impact: "high",
      category: "spending",
      estimatedSaving: overspend,
      tag: "⚡ Quick Win",
    });
  }

  if (monthlyExpenses > 0 && monthlyIncome > 0) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const diningTxs = await db.select().from(transactionsTable).where(
      and(
        eq(transactionsTable.userId, userId),
        gte(transactionsTable.date, `${currentMonth}-01`),
        lte(transactionsTable.date, now.toISOString().substring(0, 10))
      )
    );
    const catRows = await db.select().from(categoriesTable);
    const foodCatIds = catRows.filter((c) => c.name === "Food & Dining").map((c) => c.id);
    const diningTotal = diningTxs
      .filter((t) => t.type === "debit" && t.categoryId && foodCatIds.includes(t.categoryId))
      .reduce((s, t) => s + parseFloat(t.amount), 0);
    const diningPct = monthlyIncome > 0 ? (diningTotal / monthlyIncome) * 100 : 0;
    if (diningPct > 15) {
      actions.push({
        id: "reduce_dining",
        priority: 4,
        title: "Reduce Dining & Food Spend",
        description: `Food & dining is ${diningPct.toFixed(0)}% of your income this month ($${diningTotal.toFixed(0)}). Meal prepping 3 days a week could save ~$${Math.round(diningTotal * 0.25)}.`,
        impact: "medium",
        category: "food",
        estimatedSaving: Math.round(diningTotal * 0.25),
        tag: "🍽️ Lifestyle",
      });
    }
  }

  if (scoreResult.safeZoneBalance > 0 && monthlyIncome > 0) {
    const liquid = scoreResult.safeZoneBalance;
    if (liquid < monthlyIncome) {
      actions.push({
        id: "build_buffer",
        priority: 5,
        title: "Build Your Safety Buffer",
        description: `Your liquid balance is below 1.5× your monthly income threshold. Aim to keep at least $${(monthlyIncome * 1.5).toFixed(0)} accessible — start with a small weekly savings habit.`,
        impact: "medium",
        category: "savings",
        tag: "🛡️ Protection",
      });
    }
  }

  if (actions.length === 0) {
    actions.push({
      id: "maintain_habits",
      priority: 1,
      title: "Maintain Your Healthy Habits",
      description: "You're in great financial shape! Stay consistent with your savings and keep monitoring spending velocity each month.",
      impact: "low",
      category: "general",
      tag: "✅ On Track",
    });
  }

  return actions.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

export interface MoneyStoryContext {
  userId: string;
  months: Array<{
    label: string;
    income: number;
    expenses: number;
    savingsRate: number;
    topCategories: Record<string, number>;
    recurringObligationCount: number;
    topMerchants: Record<string, number>;
  }>;
}

export async function buildMoneyStoryContext(userId: string): Promise<MoneyStoryContext> {
  const months = [];

  for (let i = 2; i >= 0; i--) {
    const range = dateRange(i);
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - i);
    const label = monthDate.toLocaleString("default", { month: "long", year: "numeric" });

    const [allTxs, catRows, obligations] = await Promise.all([
      db.select().from(transactionsTable).where(
        and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, range.start), lte(transactionsTable.date, range.end))
      ),
      db.select().from(categoriesTable),
      db.select().from(recurringObligationsTable).where(
        and(eq(recurringObligationsTable.userId, userId), eq(recurringObligationsTable.isActive, true))
      ),
    ]);

    const catMap = new Map(catRows.map((c) => [c.id, c]));
    const income = allTxs.filter((t) => t.type === "credit").reduce((s, t) => s + parseFloat(t.amount), 0);
    const expenses = allTxs.filter((t) => t.type === "debit").reduce((s, t) => s + parseFloat(t.amount), 0);
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

    const topCategories = allTxs
      .filter((t) => t.type === "debit" && t.categoryId)
      .reduce((acc: Record<string, number>, t) => {
        const cat = catMap.get(t.categoryId!);
        const key = cat?.name ?? "Uncategorized";
        acc[key] = (acc[key] ?? 0) + parseFloat(t.amount);
        return acc;
      }, {});

    months.push({
      label,
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      savingsRate,
      topCategories,
      recurringObligationCount: obligations.length,
      topMerchants: allTxs
        .filter((t) => t.type === "debit" && t.merchantName)
        .reduce((acc: Record<string, number>, t) => {
          const key = t.merchantName!;
          acc[key] = (acc[key] ?? 0) + parseFloat(t.amount);
          return acc;
        }, {}),
    });
  }

  return { userId, months };
}
