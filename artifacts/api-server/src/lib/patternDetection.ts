import { db } from "@workspace/db";
import { transactionsTable, categoriesTable, recurringObligationsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";

export interface BehavioralPattern {
  key: string;
  title: string;
  description: string;
  icon: string;
  severity: "info" | "warning" | "positive";
  dataPoint?: string;
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

export async function detectBehavioralPatterns(userId: string): Promise<BehavioralPattern[]> {
  const now = new Date();
  const patterns: BehavioralPattern[] = [];

  const range90 = {
    start: new Date(now.getTime() - 90 * 24 * 3600 * 1000).toISOString().substring(0, 10),
    end: now.toISOString().substring(0, 10),
  };

  const [allTxs, catRows, obligations] = await Promise.all([
    db.select().from(transactionsTable).where(
      and(
        eq(transactionsTable.userId, userId),
        gte(transactionsTable.date, range90.start),
        lte(transactionsTable.date, range90.end)
      )
    ),
    db.select().from(categoriesTable),
    db.select().from(recurringObligationsTable).where(
      and(eq(recurringObligationsTable.userId, userId), eq(recurringObligationsTable.isActive, true))
    ),
  ]);

  const catMap = new Map(catRows.map((c) => [c.id, c]));
  const debits = allTxs.filter((t) => t.type === "debit");

  // 1. Weekend vs weekday spending
  const weekendSpend = debits
    .filter((t) => { const d = new Date(t.date).getDay(); return d === 0 || d === 6; })
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const weekdaySpend = debits
    .filter((t) => { const d = new Date(t.date).getDay(); return d >= 1 && d <= 5; })
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const weekendAvgPerDay = weekendSpend / 26;
  const weekdayAvgPerDay = weekdaySpend / 65;
  if (weekdayAvgPerDay > 0 && weekendAvgPerDay > weekdayAvgPerDay * 1.3) {
    const ratio = Math.round((weekendAvgPerDay / weekdayAvgPerDay - 1) * 100);
    patterns.push({
      key: "weekend_spike",
      title: "Weekend Spending Spike",
      description: `You spend about ${ratio}% more per day on weekends than weekdays. Most of this goes to dining and entertainment.`,
      icon: "🎉",
      severity: ratio > 60 ? "warning" : "info",
      dataPoint: `+${ratio}% weekends`,
    });
  }

  // 2. Rarely-used subscriptions (recurring obligations with no matching transactions)
  if (obligations.length > 0) {
    const merchantNames = allTxs
      .filter((t) => t.merchantName)
      .map((t) => t.merchantName!.toLowerCase());

    const rarelyUsed = obligations.filter((o) => {
      const name = o.name.toLowerCase();
      return !merchantNames.some((m) => m.includes(name.split(" ")[0]) || name.includes(m.split(" ")[0]));
    });

    if (rarelyUsed.length >= 2) {
      const total = rarelyUsed.reduce((s, o) => s + parseFloat(o.amount), 0);
      patterns.push({
        key: "inactive_subscriptions",
        title: "Subscriptions You May Not Be Using",
        description: `${rarelyUsed.length} subscription${rarelyUsed.length > 1 ? "s" : ""} (${rarelyUsed.map((o) => o.name).slice(0, 3).join(", ")}) show no matching transactions in the last 90 days — worth reviewing.`,
        icon: "💸",
        severity: "warning",
        dataPoint: `$${total.toFixed(0)}/mo potential savings`,
      });
    }
  }

  // 3. Category trend — biggest growing category
  const prev30 = {
    start: new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString().substring(0, 10),
    end: new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().substring(0, 10),
  };
  const curr30 = {
    start: new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().substring(0, 10),
    end: now.toISOString().substring(0, 10),
  };

  const prevDebits = debits.filter((t) => t.date >= prev30.start && t.date < prev30.end && t.categoryId);
  const currDebits = debits.filter((t) => t.date >= curr30.start && t.date <= curr30.end && t.categoryId);

  const prevByCat: Record<string, number> = {};
  const currByCat: Record<string, number> = {};

  for (const t of prevDebits) {
    const cat = catMap.get(t.categoryId!)?.name ?? "Other";
    prevByCat[cat] = (prevByCat[cat] ?? 0) + parseFloat(t.amount);
  }
  for (const t of currDebits) {
    const cat = catMap.get(t.categoryId!)?.name ?? "Other";
    currByCat[cat] = (currByCat[cat] ?? 0) + parseFloat(t.amount);
  }

  let biggestGrowthCat = "";
  let biggestGrowthRatio = 0;
  for (const [cat, curr] of Object.entries(currByCat)) {
    const prev = prevByCat[cat] ?? 0;
    if (prev > 0 && curr > prev * 1.3 && curr > 50) {
      const ratio = curr / prev;
      if (ratio > biggestGrowthRatio) {
        biggestGrowthRatio = ratio;
        biggestGrowthCat = cat;
      }
    }
  }
  if (biggestGrowthCat) {
    const pct = Math.round((biggestGrowthRatio - 1) * 100);
    patterns.push({
      key: "category_surge",
      title: `${biggestGrowthCat} Spending Up`,
      description: `Your ${biggestGrowthCat} spending jumped ${pct}% this month compared to last. Consider whether this reflects a one-time expense or a new habit.`,
      icon: "📈",
      severity: pct > 80 ? "warning" : "info",
      dataPoint: `+${pct}% vs last month`,
    });
  }

  // 4. Positive: consistent savings
  const monthlyData = [];
  for (let i = 2; i >= 0; i--) {
    const r = dateRange(i);
    const monthTxs = allTxs.filter((t) => t.date >= r.start && t.date <= r.end);
    const income = monthTxs.filter((t) => t.type === "credit").reduce((s, t) => s + parseFloat(t.amount), 0);
    const expenses = monthTxs.filter((t) => t.type === "debit").reduce((s, t) => s + parseFloat(t.amount), 0);
    monthlyData.push({ income, expenses, rate: income > 0 ? (income - expenses) / income : 0 });
  }

  const allPositive = monthlyData.every((m) => m.rate > 0.1);
  if (allPositive) {
    const avgRate = Math.round(monthlyData.reduce((s, m) => s + m.rate, 0) / monthlyData.length * 100);
    patterns.push({
      key: "consistent_saver",
      title: "Consistent Saver",
      description: `You've maintained a positive savings rate (avg ${avgRate}%) for 3 consecutive months. This discipline compounds over time.`,
      icon: "🌱",
      severity: "positive",
      dataPoint: `${avgRate}% avg savings rate`,
    });
  }

  // 5. Spending cluster — many transactions in short bursts
  const dayTxCounts: Record<string, number> = {};
  for (const t of debits) {
    dayTxCounts[t.date] = (dayTxCounts[t.date] ?? 0) + 1;
  }
  const burstDays = Object.values(dayTxCounts).filter((c) => c >= 5).length;
  if (burstDays >= 3) {
    patterns.push({
      key: "spending_bursts",
      title: "Spending in Bursts",
      description: `You had ${burstDays} days with 5+ transactions in the past 90 days. Burst shopping days often lead to impulse purchases — consider a 24-hour rule for non-essentials.`,
      icon: "⚡",
      severity: "info",
      dataPoint: `${burstDays} burst days`,
    });
  }

  // 6. Positive: diversified spending (low concentration in one category)
  const totalSpend = debits.reduce((s, t) => s + parseFloat(t.amount), 0);
  if (totalSpend > 0) {
    const maxCatSpend = Math.max(...Object.values(currByCat));
    const concentration = maxCatSpend / totalSpend;
    if (concentration < 0.35 && Object.keys(currByCat).length >= 4) {
      patterns.push({
        key: "balanced_spending",
        title: "Well-Balanced Spending",
        description: "No single category dominates your budget — your spending is spread across categories, which signals financial balance.",
        icon: "⚖️",
        severity: "positive",
        dataPoint: `${Math.round(concentration * 100)}% top category`,
      });
    }
  }

  return patterns.slice(0, 6);
}
