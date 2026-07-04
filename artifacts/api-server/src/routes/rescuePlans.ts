import { Router } from "express";
import { db } from "@workspace/db";
import { rescuePlansTable, transactionsTable } from "@workspace/db";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireConsent } from "../middlewares/requireConsent";
import { getOrCreateUser } from "../lib/userProvisioning";
import { computeRegretScore, buildRescueActions } from "../lib/financialIntelligence";
import { decryptApiKey } from "../lib/encryption";
import { usersTable } from "@workspace/db";

const router = Router();

router.get("/rescue-plans", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const user = await getOrCreateUser(userId);

  const score = await computeRegretScore(userId);

  const now = new Date().toISOString().substring(0, 10);
  const monthBegin = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);
  const monthTxs = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, monthBegin), lte(transactionsTable.date, now)));

  const monthlyExpenses = monthTxs.filter((t) => t.type === "debit").reduce((s, t) => s + parseFloat(t.amount), 0);

  const actions = await buildRescueActions(userId, score);

  // Try to enrich with AI narrative (best-effort, non-blocking)
  let narrative: string | null = null;
  let aiUnavailable = false;
  try {
    let apiKey: string | null = null;
    if (user.encryptedOpenAiKey) {
      apiKey = decryptApiKey(user.encryptedOpenAiKey);
    } else if (process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY;
    }

    if (!apiKey) {
      console.warn("[rescuePlans] GET /rescue-plans: No OpenAI API key available. Serving deterministic fallback.", { userId: (req as any).userId, riskLevel: score.level });
      aiUnavailable = true;
    } else {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey });
      const prompt = `You are a compassionate financial coach for "Guardia". The user's financial regret risk score is ${score.score}/100 (${score.level} risk). Key factors: ${score.factors.map((f) => f.label).join(", ")}. Write a warm, non-judgmental 2-sentence intro for their rescue plan. Be specific and actionable. No markdown.`;
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.7,
      });
      narrative = resp.choices[0]?.message?.content?.trim() ?? null;
      if (!narrative) {
        console.warn("[rescuePlans] GET /rescue-plans: OpenAI returned empty content. Serving deterministic fallback.", { userId: (req as any).userId, riskLevel: score.level });
        aiUnavailable = true;
      }
    }
  } catch (err) {
    const errorCode = (err as any)?.status ?? (err as any)?.code ?? "unknown";
    const errorMessage = (err as any)?.message ?? String(err);
    console.error("[rescuePlans] GET /rescue-plans: OpenAI call failed. Serving deterministic fallback.", {
      userId: (req as any).userId,
      riskLevel: score.level,
      errorCode,
      errorMessage,
    });
    aiUnavailable = true;
  }

  if (aiUnavailable || !narrative) {
    aiUnavailable = true;
    narrative =
      score.level === "low"
        ? "You're in great financial shape this month. These optimizations can help you build even more momentum."
        : score.level === "medium"
        ? "Your finances need some attention. These targeted actions can bring your spending back in line quickly."
        : "Your spending patterns are raising some red flags. Taking even one of these actions today can meaningfully reduce your risk.";
  }

  const plan = {
    riskLevel: score.level,
    actions,
    narrative,
    aiUnavailable,
    generatedAt: new Date().toISOString(),
  };

  await db.insert(rescuePlansTable).values({
    userId,
    riskLevel: plan.riskLevel,
    actions: plan.actions as any,
    narrative: plan.narrative,
  });

  res.json(plan);
});

export default router;
