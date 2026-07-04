import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { decryptApiKey } from "./encryption";

export async function getOpenAIClient(userId: string): Promise<{ openai: import("openai").default; source: "user" | "server" } | null> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  let apiKey: string | null = null;
  let source: "user" | "server" | null = null;

  if (user?.encryptedOpenAiKey) {
    try {
      apiKey = decryptApiKey(user.encryptedOpenAiKey);
      source = "user";
    } catch {
      // Fall through
    }
  }

  if (!apiKey && process.env.OPENAI_API_KEY) {
    apiKey = process.env.OPENAI_API_KEY;
    source = "server";
  }

  if (!apiKey || !source) return null;

  const { default: OpenAI } = await import("openai");
  return { openai: new OpenAI({ apiKey }), source };
}

export async function generateRescueNarrative(
  userId: string,
  riskLevel: string,
  actions: Array<{ title: string; description: string; tag: string; estimatedSaving?: number }>,
  context: { savingsRate: number; spendingVelocityRatio: number; recurringBurdenPct: number }
): Promise<string> {
  const client = await getOpenAIClient(userId);
  if (!client) {
    return generateFallbackRescueNarrative(riskLevel, actions, context);
  }

  const actionSummary = actions
    .slice(0, 3)
    .map((a) => `- ${a.tag} ${a.title}: ${a.description}`)
    .join("\n");

  const prompt = `You are a warm, empathetic personal finance coach. A user has a ${riskLevel} financial regret risk score.

Key signals:
- Savings rate: ${context.savingsRate}%
- Spending vs last month: ${Math.round(context.spendingVelocityRatio * 100)}%
- Fixed costs burden: ${context.recurringBurdenPct}% of income

Top recommended actions:
${actionSummary}

Write a concise, encouraging 2–3 sentence narrative (max 80 words) that:
1. Acknowledges the current situation honestly but without alarm
2. Highlights the single most impactful action they can take today
3. Ends with an empowering note

Respond with just the narrative text — no headers, no bullet points.`;

  try {
    const response = await client.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content?.trim() ?? generateFallbackRescueNarrative(riskLevel, actions, context);
  } catch {
    return generateFallbackRescueNarrative(riskLevel, actions, context);
  }
}

function generateFallbackRescueNarrative(
  riskLevel: string,
  actions: Array<{ title: string; tag: string }>,
  context: { savingsRate: number }
): string {
  if (riskLevel === "low") {
    return `Your finances are in great shape with a ${context.savingsRate}% savings rate. Keep your current habits going — consistency is the real superpower in personal finance.`;
  }
  if (riskLevel === "medium") {
    const top = actions[0];
    return `Things are manageable, but there's room to strengthen your position. Your most impactful move right now is: ${top?.tag} ${top?.title}. Small adjustments today create big protection tomorrow.`;
  }
  return `Your spending signals need attention, but you're already ahead by seeing this clearly. Start with the highest-priority action and tackle one thing at a time — financial recovery is a series of small, consistent wins.`;
}

export async function generateMoneyStory(
  userId: string,
  periodLabel: string,
  signals: Record<string, unknown>
): Promise<string> {
  const client = await getOpenAIClient(userId);
  if (!client) {
    return generateFallbackMoneyStory(periodLabel, signals);
  }

  const monthlyBreakdowns = signals.monthlyBreakdowns as Array<{
    month: string;
    income: number;
    expenses: number;
    savingsRate: number;
    topCategories: Array<{ name: string; amount: number }>;
  }>;

  const breakdownText = [...monthlyBreakdowns].reverse().map((m) =>
    `${m.month}: Income $${m.income}, Expenses $${m.expenses}, Savings rate ${m.savingsRate}%, Top spending: ${m.topCategories.map((c) => `${c.name} $${c.amount}`).join(", ")}`
  ).join("\n");

  const prompt = `You are a thoughtful personal finance narrator. Turn this user's 3-month financial data into a personalized, engaging story (150–200 words) that reads like a chapter of their financial life.

Period: ${periodLabel}
Total balance: $${signals.totalBalance}
Monthly fixed obligations: $${signals.recurringObligationsTotal}

Month-by-month:
${breakdownText}

Write in second person ("you", "your"). The story should:
- Open with the overall arc of the 3 months (improving, declining, steady?)
- Highlight 1–2 specific patterns worth noting (a spending category trend, a savings milestone, etc.)
- Acknowledge their recurring commitments as part of their financial personality
- Close with a forward-looking insight based on the trajectory

Make it feel human and insightful — not like a spreadsheet summary. No bullet points or headers.`;

  try {
    const response = await client.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.75,
    });
    return response.choices[0]?.message?.content?.trim() ?? generateFallbackMoneyStory(periodLabel, signals);
  } catch {
    return generateFallbackMoneyStory(periodLabel, signals);
  }
}

function generateFallbackMoneyStory(periodLabel: string, signals: Record<string, unknown>): string {
  const breakdowns = signals.monthlyBreakdowns as Array<{ month: string; income: number; expenses: number; savingsRate: number }>;
  if (!breakdowns || breakdowns.length === 0) {
    return `Over the period of ${periodLabel}, your financial activity reflects a snapshot of your daily choices and commitments. Keep tracking your spending to uncover deeper patterns in your financial story.`;
  }
  const avgSavings = breakdowns.reduce((s, m) => s + m.savingsRate, 0) / breakdowns.length;
  const trend = breakdowns[0].savingsRate > breakdowns[breakdowns.length - 1].savingsRate ? "improving" : "steady";
  return `Over ${periodLabel}, your financial story has been one of ${trend} discipline. With an average savings rate of ${avgSavings.toFixed(0)}%, you've balanced $${signals.recurringObligationsTotal} in monthly fixed commitments while navigating everyday spending. Your patterns reflect someone who is thoughtful about their money — and each month of data gives you more clarity about where your financial energy goes. Keep building on this foundation.`;
}
