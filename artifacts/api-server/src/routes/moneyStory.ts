import { Router } from "express";
import { db } from "@workspace/db";
import { moneyStoriesTable, transactionsTable, accountsTable, categoriesTable } from "@workspace/db";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireConsent } from "../middlewares/requireConsent";
import { getOrCreateUser } from "../lib/userProvisioning";
import { decryptApiKey } from "../lib/encryption";
import { usersTable } from "@workspace/db";

const router = Router();

router.get("/money-story", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);

  const [latest] = await db
    .select()
    .from(moneyStoriesTable)
    .where(eq(moneyStoriesTable.userId, userId))
    .orderBy(desc(moneyStoriesTable.generatedAt))
    .limit(1);

  if (!latest) {
    res.json(null);
    return;
  }

  res.json({
    id: latest.id,
    periodLabel: latest.periodLabel,
    narrative: latest.narrative,
    generatedAt: latest.generatedAt.toISOString(),
  });
});

router.post("/money-story/generate", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const user = await getOrCreateUser(userId);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
  const monthEnd = now.toISOString().substring(0, 10);
  const periodLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const [accounts, categories, monthTxs] = await Promise.all([
    db.select().from(accountsTable).where(and(eq(accountsTable.userId, userId), eq(accountsTable.isActive, true))),
    db.select().from(categoriesTable),
    db.select().from(transactionsTable).where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, monthStart), lte(transactionsTable.date, monthEnd))),
  ]);

  const catMap = new Map(categories.map((c) => [c.id, c]));

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance), 0);
  const income = monthTxs.filter((t) => t.type === "credit").reduce((s, t) => s + parseFloat(t.amount), 0);
  const expenses = monthTxs.filter((t) => t.type === "debit").reduce((s, t) => s + parseFloat(t.amount), 0);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  const catTotals = new Map<number, number>();
  monthTxs.filter((t) => t.type === "debit" && t.categoryId != null).forEach((t) => {
    catTotals.set(t.categoryId!, (catTotals.get(t.categoryId!) ?? 0) + parseFloat(t.amount));
  });
  const topCats = [...catTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, total]) => ({
    name: catMap.get(id)?.name ?? "Other",
    total: total.toFixed(2),
  }));

  // Compose structured context for the LLM
  const financialContext = `
Period: ${periodLabel}
Total balance: $${totalBalance.toFixed(2)}
Income this month: $${income.toFixed(2)}
Expenses this month: $${expenses.toFixed(2)}
Savings rate: ${savingsRate.toFixed(1)}%
Top spending categories: ${topCats.map((c) => `${c.name} ($${c.total})`).join(", ")}
Number of transactions: ${monthTxs.length}
  `.trim();

  let narrative = "";

  try {
    let apiKey: string | null = null;
    if (user.encryptedOpenAiKey) {
      apiKey = decryptApiKey(user.encryptedOpenAiKey);
    } else if (process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY;
    }

    if (apiKey) {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey });
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              'You are a warm, insightful financial storyteller for "Guardia". Turn the user\'s financial data into a compelling, personal narrative (3–4 paragraphs, ~200 words). Use "you" language. Be specific with numbers. Show patterns, highlight what went well, and gently note opportunities. No bullet points. No markdown. Conversational and encouraging.',
          },
          {
            role: "user",
            content: `Here is my financial summary:\n${financialContext}\n\nWrite my money story.`,
          },
        ],
        max_tokens: 350,
        temperature: 0.75,
      });
      narrative = resp.choices[0]?.message?.content?.trim() ?? "";
    }
  } catch {
    // AI failed — use rich deterministic fallback
  }

  if (!narrative) {
    const trend = savingsRate >= 15 ? "strong" : savingsRate >= 5 ? "moderate" : "tight";
    narrative = `This was a ${trend} month for you financially. You brought in $${income.toFixed(0)} and spent $${expenses.toFixed(0)}, keeping a savings rate of ${savingsRate.toFixed(1)}%. Your total balance stands at $${totalBalance.toFixed(0)}.

Your biggest spending areas were ${topCats.map((c) => `${c.name}`).join(" and ")}, which is where most of your discretionary energy went this month. You made ${monthTxs.length} transactions across your ${accounts.length} account${accounts.length !== 1 ? "s" : ""}.

${savingsRate >= 15 ? "You're building real financial momentum. Keep going — this kind of consistency compounds over time." : savingsRate >= 5 ? "There's room to grow your savings rate, but you're moving in the right direction. Small, consistent changes will get you there." : "This month was challenging, but awareness is the first step. Review your top spending categories and look for one easy cut you can make next month."}`;
  }

  const [story] = await db
    .insert(moneyStoriesTable)
    .values({ userId, periodLabel, narrative })
    .returning();

  res.json({
    id: story.id,
    periodLabel: story.periodLabel,
    narrative: story.narrative,
    generatedAt: story.generatedAt.toISOString(),
  });
});

export default router;
