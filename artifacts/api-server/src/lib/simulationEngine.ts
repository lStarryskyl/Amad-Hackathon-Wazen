import { db } from "@workspace/db";
import {
  accountsTable,
  transactionsTable,
  recurringObligationsTable,
  goalsTable,
} from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";

export interface ScenarioInputs {
  scenarioName: string;
  incomeChangePercent: number;
  spendingChangePercent: number;
  additionalMonthlySaving: number;
  newMonthlyObligation: number;
  oneTimeExpense: number;
  timeHorizonMonths: number;
}

export interface MonthDataPoint {
  month: number;
  label: string;
  balance: number;
  netCash: number;
  cumulativeSaved: number;
  riskLevel: "low" | "medium" | "high";
}

export interface GoalTimeline {
  goalId: number;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  monthsToComplete: number | null;
  completionLabel: string | null;
}

export interface SimulationResults {
  dataPoints: MonthDataPoint[];
  goalTimelines: GoalTimeline[];
  finalBalance: number;
  finalSavingsRate: number;
  totalSaved: number;
  totalSpent: number;
  avgMonthlySavings: number;
  breakEvenMonth: number | null;
  startingBalance: number;
  baseMonthlyIncome: number;
  baseMonthlyExpenses: number;
  projectedMonthlyIncome: number;
  projectedMonthlyExpenses: number;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthLabel(offsetFromNow: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetFromNow);
  return d.toLocaleString("default", { month: "short", year: "numeric" });
}

function riskLevel(savingsRate: number, balanceToIncomeRatio: number): "low" | "medium" | "high" {
  if (savingsRate >= 15 && balanceToIncomeRatio >= 1.5) return "low";
  if (savingsRate >= 0 && balanceToIncomeRatio >= 0.5) return "medium";
  return "high";
}

export async function runSimulation(userId: string, inputs: ScenarioInputs): Promise<SimulationResults> {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevStart = `${prevMonthDate.getFullYear()}-${pad(prevMonthDate.getMonth() + 1)}-01`;
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const prevEndStr = `${prevEnd.getFullYear()}-${pad(prevEnd.getMonth() + 1)}-${pad(prevEnd.getDate())}`;

  const [accounts, obligations, goals, prevTxs] = await Promise.all([
    db.select().from(accountsTable).where(and(eq(accountsTable.userId, userId), eq(accountsTable.isActive, true))),
    db.select().from(recurringObligationsTable).where(and(eq(recurringObligationsTable.userId, userId), eq(recurringObligationsTable.isActive, true))),
    db.select().from(goalsTable).where(and(eq(goalsTable.userId, userId), eq(goalsTable.status, "active"))),
    db.select().from(transactionsTable).where(
      and(
        eq(transactionsTable.userId, userId),
        gte(transactionsTable.date, prevStart),
        lte(transactionsTable.date, prevEndStr),
      )
    ),
  ]);

  const startingBalance = accounts.reduce((s, a) => s + parseFloat(a.balance), 0);

  const baseMonthlyIncome = Math.max(
    prevTxs.filter((t) => t.type === "credit").reduce((s, t) => s + parseFloat(t.amount), 0),
    1000
  );
  const baseMonthlyExpenses = Math.max(
    prevTxs.filter((t) => t.type === "debit").reduce((s, t) => s + parseFloat(t.amount), 0),
    0
  );

  const monthlyRecurring = obligations.reduce((s, o) => {
    const amt = parseFloat(o.amount);
    if (o.frequency === "weekly") return s + amt * 4.33;
    if (o.frequency === "yearly") return s + amt / 12;
    return s + amt;
  }, 0);

  const projectedMonthlyIncome = baseMonthlyIncome * (1 + inputs.incomeChangePercent / 100);
  const baseDiscretionary = Math.max(0, baseMonthlyExpenses - monthlyRecurring);
  const projectedDiscretionary = baseDiscretionary * (1 + inputs.spendingChangePercent / 100);
  const projectedMonthlyObligation = monthlyRecurring + inputs.newMonthlyObligation;
  const projectedMonthlyExpenses = projectedDiscretionary + projectedMonthlyObligation;

  const dataPoints: MonthDataPoint[] = [];
  let balance = startingBalance - inputs.oneTimeExpense;
  let cumulativeSaved = 0;
  let totalSpent = 0;
  let breakEvenMonth: number | null = null;

  const netPerMonth = projectedMonthlyIncome - projectedMonthlyExpenses + inputs.additionalMonthlySaving;

  for (let m = 0; m <= inputs.timeHorizonMonths; m++) {
    if (m > 0) {
      balance += netPerMonth;
      const saved = Math.max(0, netPerMonth);
      cumulativeSaved += saved;
      totalSpent += projectedMonthlyExpenses;
    }

    const savingsRate = projectedMonthlyIncome > 0
      ? ((projectedMonthlyIncome - projectedMonthlyExpenses + inputs.additionalMonthlySaving) / projectedMonthlyIncome) * 100
      : 0;
    const balanceRatio = projectedMonthlyIncome > 0 ? balance / projectedMonthlyIncome : 0;

    if (breakEvenMonth === null && balance >= startingBalance && m > 0) {
      breakEvenMonth = m;
    }

    dataPoints.push({
      month: m,
      label: m === 0 ? "Now" : monthLabel(m),
      balance: Math.round(balance * 100) / 100,
      netCash: Math.round(netPerMonth * 100) / 100,
      cumulativeSaved: Math.round(cumulativeSaved * 100) / 100,
      riskLevel: riskLevel(savingsRate, balanceRatio),
    });
  }

  const finalBalance = dataPoints[dataPoints.length - 1].balance;
  const finalSavingsRate = projectedMonthlyIncome > 0
    ? ((projectedMonthlyIncome - projectedMonthlyExpenses + inputs.additionalMonthlySaving) / projectedMonthlyIncome) * 100
    : 0;
  const avgMonthlySavings = inputs.timeHorizonMonths > 0 ? cumulativeSaved / inputs.timeHorizonMonths : 0;

  const goalTimelines: GoalTimeline[] = goals.map((g) => {
    const target = parseFloat(g.targetAmount);
    const current = parseFloat(g.currentAmount);
    const remaining = target - current;
    let monthsToComplete: number | null = null;
    let completionLabel: string | null = null;

    if (remaining <= 0) {
      monthsToComplete = 0;
      completionLabel = "Already reached";
    } else if (avgMonthlySavings > 0) {
      const months = Math.ceil(remaining / avgMonthlySavings);
      if (months <= inputs.timeHorizonMonths) {
        monthsToComplete = months;
        const d = new Date();
        d.setMonth(d.getMonth() + months);
        completionLabel = d.toLocaleString("default", { month: "long", year: "numeric" });
      }
    }

    return {
      goalId: g.id,
      goalName: g.name,
      targetAmount: target,
      currentAmount: current,
      monthsToComplete,
      completionLabel,
    };
  });

  return {
    dataPoints,
    goalTimelines,
    finalBalance: Math.round(finalBalance * 100) / 100,
    finalSavingsRate: Math.round(finalSavingsRate * 100) / 100,
    totalSaved: Math.round(cumulativeSaved * 100) / 100,
    totalSpent: Math.round(totalSpent * 100) / 100,
    avgMonthlySavings: Math.round(avgMonthlySavings * 100) / 100,
    breakEvenMonth,
    startingBalance: Math.round(startingBalance * 100) / 100,
    baseMonthlyIncome: Math.round(baseMonthlyIncome * 100) / 100,
    baseMonthlyExpenses: Math.round(baseMonthlyExpenses * 100) / 100,
    projectedMonthlyIncome: Math.round(projectedMonthlyIncome * 100) / 100,
    projectedMonthlyExpenses: Math.round(projectedMonthlyExpenses * 100) / 100,
  };
}
