import { db } from "@workspace/db";
import { transactionsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte, inArray } from "drizzle-orm";
import { getAIClient, getAIModel } from "./aiOrchestration.js";
import type { ScenarioInputs } from "./simulationEngine.js";

export const MAX_HORIZON_MONTHS = 6;

export interface MonthSpendingSummary {
  label: string; // e.g. "May 2026"
  income: number;
  expenses: number;
  topCategories: { name: string; amount: number }[];
}

export interface TransactionContext {
  months: MonthSpendingSummary[];
  hasData: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Pull the user's last 3 full months of transactions, grouped by month with
 * per-category expense breakdowns. This is the grounding context handed to
 * the AI so prompt parsing and narratives reflect real spending history.
 */
export async function buildTransactionContext(userId: string): Promise<TransactionContext> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`;

  const txs = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, startStr)));

  const categoryIds = [...new Set(txs.map((t) => t.categoryId).filter((id): id is number => id !== null))];
  const categories = categoryIds.length
    ? await db.select().from(categoriesTable).where(inArray(categoriesTable.id, categoryIds))
    : [];
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const byMonth = new Map<string, { income: number; expenses: number; cats: Map<string, number> }>();
  for (const t of txs) {
    const key = t.date.slice(0, 7); // YYYY-MM
    if (!byMonth.has(key)) byMonth.set(key, { income: 0, expenses: 0, cats: new Map() });
    const m = byMonth.get(key)!;
    const amt = parseFloat(t.amount);
    if (t.type === "credit") {
      m.income += amt;
    } else {
      m.expenses += amt;
      const name = t.categoryId != null ? catName.get(t.categoryId) ?? "Other" : "Other";
      m.cats.set(name, (m.cats.get(name) ?? 0) + amt);
    }
  }

  const months: MonthSpendingSummary[] = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, m]) => {
      const [y, mo] = key.split("-").map(Number);
      const label = new Date(y, mo - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
      const topCategories = [...m.cats.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }));
      return {
        label,
        income: Math.round(m.income * 100) / 100,
        expenses: Math.round(m.expenses * 100) / 100,
        topCategories,
      };
    });

  return { months, hasData: months.some((m) => m.income > 0 || m.expenses > 0) };
}

export function formatContextForPrompt(context: TransactionContext): string {
  if (!context.hasData) return "No transaction history available yet.";
  return context.months
    .map((m) => {
      const cats = m.topCategories.map((c) => `${c.name} $${c.amount.toLocaleString()}`).join(", ");
      return `${m.label}: income $${m.income.toLocaleString()}, expenses $${m.expenses.toLocaleString()}${cats ? ` (top: ${cats})` : ""}`;
    })
    .join("\n");
}

export interface ParsedScenario {
  inputs: ScenarioInputs;
  assumptions: string[];
  aiUnavailable: boolean;
}

function clampNumber(v: unknown, min: number, max: number, fallback = 0): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function shortName(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  return cleaned.length <= 60 ? cleaned : cleaned.slice(0, 57) + "…";
}

/**
 * Deterministic fallback parser used when the AI is unavailable — extracts
 * percentages and dollar amounts from common phrasings.
 */
export function heuristicParseScenario(prompt: string): ParsedScenario {
  const p = prompt.toLowerCase();
  const inputs: ScenarioInputs = {
    scenarioName: shortName(prompt),
    incomeChangePercent: 0,
    spendingChangePercent: 0,
    additionalMonthlySaving: 0,
    newMonthlyObligation: 0,
    oneTimeExpense: 0,
    timeHorizonMonths: MAX_HORIZON_MONTHS,
  };
  const assumptions: string[] = [];

  const pctMatch = p.match(/(\d+(?:\.\d+)?)\s*%/);
  const pct = pctMatch ? parseFloat(pctMatch[1]) : null;
  const dollarMatch = p.match(/\$?\s?(\d[\d,]*(?:\.\d+)?)\s*(?:\/|per\s+|a\s+)?(mo|month)?/);
  const dollars = dollarMatch ? parseFloat(dollarMatch[1].replace(/,/g, "")) : null;
  const monthly = /\/\s*mo|per month|a month|monthly|\/month/.test(p);

  const cutting = /\b(cut|reduce|lower|trim|less|stop|cancel|drop)\b/.test(p);
  const spendingWords = /\b(spend|dining|eating|groceries|shopping|subscriptions?|entertainment|coffee|takeout|expenses?)\b/.test(p);
  const incomeWords = /\b(raise|salary|income|earn|side\s?hustle|freelance|job)\b/.test(p);
  const savingWords = /\b(save|saving|savings|set aside|put away|invest)\b/.test(p);
  const obligationWords = /\b(loan|lease|rent|car payment|mortgage|subscription|gym|debt payment)\b/.test(p);

  if (incomeWords && pct !== null) {
    inputs.incomeChangePercent = /\b(lose|cut|reduce|drop|pay ?cut)\b/.test(p) ? -pct : pct;
    assumptions.push(`Interpreted as a ${inputs.incomeChangePercent > 0 ? "+" : ""}${inputs.incomeChangePercent}% income change.`);
  } else if (spendingWords && pct !== null) {
    inputs.spendingChangePercent = cutting ? -pct : pct;
    assumptions.push(`Interpreted as a ${inputs.spendingChangePercent}% change to discretionary spending.`);
  } else if (savingWords && dollars !== null) {
    inputs.additionalMonthlySaving = dollars;
    assumptions.push(`Interpreted as saving an extra $${dollars.toLocaleString()} per month.`);
  } else if (obligationWords && dollars !== null && monthly) {
    inputs.newMonthlyObligation = dollars;
    assumptions.push(`Interpreted as a new $${dollars.toLocaleString()}/month obligation.`);
  } else if (dollars !== null && !monthly) {
    inputs.oneTimeExpense = dollars;
    assumptions.push(`Interpreted as a one-time $${dollars.toLocaleString()} expense.`);
  } else if (pct !== null) {
    inputs.spendingChangePercent = cutting ? -pct : pct;
    assumptions.push(`Interpreted as a ${inputs.spendingChangePercent}% spending change.`);
  } else {
    assumptions.push("Couldn't detect specific numbers — showing your baseline trajectory.");
  }

  assumptions.push("Forecast capped at 6 months to stay realistic.");
  return { inputs, assumptions, aiUnavailable: true };
}

/**
 * Turn a natural-language what-if question into structured scenario inputs,
 * grounded in the user's actual transaction history. Falls back to a
 * deterministic heuristic parser when the AI is unavailable.
 */
export async function parseScenarioPrompt(
  userId: string,
  prompt: string,
  context: TransactionContext
): Promise<ParsedScenario> {
  const skipAI = process.env.NODE_ENV !== "production" && process.env.SKIP_AI_NARRATIVE === "true";
  const aiClient = skipAI ? null : await getAIClient(userId);
  if (!aiClient) return heuristicParseScenario(prompt);

  const systemPrompt = `You convert a user's plain-English financial what-if question into structured simulation parameters, using their real spending history for grounding.

User's recent history:
${formatContextForPrompt(context)}

Respond with ONLY a JSON object (no markdown fences) with these keys:
- "scenarioName": short title (max 50 chars) for this scenario
- "incomeChangePercent": number, % change to monthly income (-50 to 100)
- "spendingChangePercent": number, % change to discretionary spending (-60 to 60). If the user references a specific category (e.g. dining), estimate the % this represents of their total discretionary spending using their history. Example: cutting dining 30% when dining is ~20% of discretionary spending → spendingChangePercent of about -6.
- "additionalMonthlySaving": number ≥ 0, extra dollars saved monthly
- "newMonthlyObligation": number ≥ 0, new recurring monthly cost
- "oneTimeExpense": number ≥ 0, single upfront cost
- "timeHorizonMonths": integer 1-6 (never more than 6)
- "assumptions": array of 1-3 short strings explaining how you interpreted the question and any estimates you made from their history

Unrelated fields must be 0. If the question is vague, make a sensible conservative estimate and say so in assumptions.`;

  try {
    const response = await aiClient.client.chat.completions.create({
      model: getAIModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 400,
      temperature: 0.2,
    });
    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    const jsonText = raw.replace(/^```(?:json)?/m, "").replace(/```$/m, "").trim();
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;

    const inputs: ScenarioInputs = {
      scenarioName:
        typeof parsed.scenarioName === "string" && parsed.scenarioName.trim()
          ? parsed.scenarioName.trim().slice(0, 60)
          : shortName(prompt),
      incomeChangePercent: clampNumber(parsed.incomeChangePercent, -50, 100),
      spendingChangePercent: clampNumber(parsed.spendingChangePercent, -60, 60),
      additionalMonthlySaving: clampNumber(parsed.additionalMonthlySaving, 0, 100000),
      newMonthlyObligation: clampNumber(parsed.newMonthlyObligation, 0, 100000),
      oneTimeExpense: clampNumber(parsed.oneTimeExpense, 0, 10000000),
      timeHorizonMonths: Math.round(clampNumber(parsed.timeHorizonMonths, 1, MAX_HORIZON_MONTHS, MAX_HORIZON_MONTHS)),
    };
    const assumptions = Array.isArray(parsed.assumptions)
      ? parsed.assumptions.filter((a): a is string => typeof a === "string").slice(0, 3)
      : [];
    return { inputs, assumptions, aiUnavailable: false };
  } catch (err) {
    console.error("[ai] parseScenarioPrompt: falling back to heuristic parser.", {
      userId,
      error: (err as any)?.message ?? String(err),
    });
    return heuristicParseScenario(prompt);
  }
}
