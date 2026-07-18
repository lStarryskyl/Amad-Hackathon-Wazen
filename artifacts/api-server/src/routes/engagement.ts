import { Router } from "express";
import { db } from "@workspace/db";
import {
  guardrailsTable,
  streaksTable,
  achievementsTable,
  dailyCheckinsTable,
  alertsTable,
  transactionsTable,
  categoriesTable,
  pushTokensTable,
} from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireConsent } from "../middlewares/requireConsent";
import { getOrCreateUser } from "../lib/userProvisioning";
import { detectBehavioralPatterns } from "../lib/patternDetection";
import { computeRegretScore } from "../lib/financialIntelligence";
import { getAIClient } from "../lib/aiOrchestration";
import { sendPushNotifications } from "../lib/pushNotifications";

const router = Router();

// ─── Behavioral Patterns ─────────────────────────────────────────────────────

router.get("/ai/patterns", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);
  try {
    const patterns = await detectBehavioralPatterns(userId);
    res.json({ patterns, detectedAt: new Date().toISOString() });
  } catch (err) {
    console.error("patterns error", err);
    res.status(500).json({ error: "InternalError", message: "Failed to detect patterns" });
  }
});

// ─── Guardrails ───────────────────────────────────────────────────────────────

router.get("/guardrails", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rows = await db
    .select()
    .from(guardrailsTable)
    .where(and(eq(guardrailsTable.userId, userId), eq(guardrailsTable.isActive, true)))
    .orderBy(desc(guardrailsTable.createdAt));
  res.json(rows);
});

router.post("/guardrails", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);
  const { categoryName, period, limitAmount, color } = req.body;
  if (!categoryName || !limitAmount) {
    res.status(400).json({ error: "BadRequest", message: "categoryName and limitAmount are required" });
    return;
  }
  const [row] = await db.insert(guardrailsTable).values({
    userId,
    categoryName,
    period: period ?? "monthly",
    limitAmount: String(limitAmount),
    color: color ?? "#6366f1",
    isActive: true,
  }).returning();
  res.status(201).json(row);
});

router.put("/guardrails/:id", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = parseInt(String(req.params.id), 10);
  const { categoryName, period, limitAmount, color, isActive } = req.body;
  const updateData: Partial<typeof guardrailsTable.$inferInsert> = { updatedAt: new Date() };
  if (categoryName !== undefined) updateData.categoryName = categoryName;
  if (period !== undefined) updateData.period = period;
  if (limitAmount !== undefined) updateData.limitAmount = String(limitAmount);
  if (color !== undefined) updateData.color = color;
  if (isActive !== undefined) updateData.isActive = isActive;

  const [row] = await db
    .update(guardrailsTable)
    .set(updateData)
    .where(and(eq(guardrailsTable.id, id), eq(guardrailsTable.userId, userId)))
    .returning();

  if (!row) {
    res.status(404).json({ error: "NotFound", message: "Guardrail not found" });
    return;
  }
  res.json(row);
});

router.delete("/guardrails/:id", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = parseInt(String(req.params.id), 10);
  await db
    .update(guardrailsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(guardrailsTable.id, id), eq(guardrailsTable.userId, userId)));
  res.status(204).send();
});

// GET /guardrails/standing — evaluate current spending vs. guardrails
router.get("/guardrails/standing", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const [guardrails, catRows] = await Promise.all([
    db.select().from(guardrailsTable).where(and(eq(guardrailsTable.userId, userId), eq(guardrailsTable.isActive, true))),
    db.select().from(categoriesTable),
  ]);

  const catMap = new Map(catRows.map((c) => [c.name.toLowerCase(), c]));

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().substring(0, 10);
  const weekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().substring(0, 10);

  const txs = await db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, userId),
        gte(transactionsTable.date, monthStart),
        lte(transactionsTable.date, today)
      )
    );

  const standing = guardrails.map((g) => {
    const cat = catMap.get(g.categoryName.toLowerCase());
    const catId = cat?.id;
    const periodStart = g.period === "weekly" ? weekStart : monthStart;

    const spent = txs
      .filter((t) => t.type === "debit" && t.date >= periodStart && (catId ? t.categoryId === catId : true))
      .reduce((s, t) => s + parseFloat(t.amount), 0);

    const limit = parseFloat(g.limitAmount);
    const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
    const status: "safe" | "warning" | "breached" =
      pct >= 100 ? "breached" : pct >= 80 ? "warning" : "safe";

    return {
      guardrail: g,
      spent: Math.round(spent * 100) / 100,
      limit,
      spentPercent: pct,
      status,
      remaining: Math.max(0, Math.round((limit - spent) * 100) / 100),
    };
  });

  res.json({ standing, evaluatedAt: new Date().toISOString() });
});

// ─── Streaks ──────────────────────────────────────────────────────────────────

async function getOrCreateStreak(userId: string, type: string) {
  const [existing] = await db
    .select()
    .from(streaksTable)
    .where(and(eq(streaksTable.userId, userId), eq(streaksTable.type, type)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(streaksTable).values({ userId, type, currentCount: 0, longestCount: 0 }).returning();
  return created;
}

async function advanceStreak(userId: string, type: string) {
  const today = new Date().toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
  const streak = await getOrCreateStreak(userId, type);

  let newCount = streak.currentCount;
  if (streak.lastDate === today) {
    return streak;
  } else if (streak.lastDate === yesterday || streak.currentCount === 0) {
    newCount = streak.currentCount + 1;
  } else {
    newCount = 1;
  }

  const newLongest = Math.max(streak.longestCount, newCount);
  const [updated] = await db
    .update(streaksTable)
    .set({ currentCount: newCount, longestCount: newLongest, lastDate: today, updatedAt: new Date() })
    .where(eq(streaksTable.id, streak.id))
    .returning();
  return updated;
}

router.get("/streaks", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rows = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
  res.json(rows);
});

// ─── Achievements ─────────────────────────────────────────────────────────────

const ACHIEVEMENT_DEFS = [
  { key: "first_checkin", title: "First Check-in", description: "Completed your very first daily check-in.", icon: "🌟" },
  { key: "streak_7", title: "7-Day Streak", description: "Checked in 7 days in a row.", icon: "🔥" },
  { key: "streak_30", title: "Month Master", description: "Maintained a 30-day check-in streak.", icon: "🏆" },
  { key: "first_guardrail", title: "Safety Net Set", description: "Created your first spending guardrail.", icon: "🛡️" },
  { key: "guardrail_safe", title: "Guardrail Champion", description: "Stayed under all guardrails for a full month.", icon: "✅" },
  { key: "first_goal", title: "Goal Setter", description: "Created your first financial goal.", icon: "🎯" },
  { key: "low_regret", title: "Safe Zone", description: "Achieved a low regret risk score.", icon: "😌" },
  { key: "saver_3months", title: "Consistent Saver", description: "Saved money for 3 consecutive months.", icon: "🌱" },
];

async function unlockAchievement(userId: string, key: string) {
  const def = ACHIEVEMENT_DEFS.find((d) => d.key === key);
  if (!def) return null;
  const [existing] = await db
    .select()
    .from(achievementsTable)
    .where(and(eq(achievementsTable.userId, userId), eq(achievementsTable.key, key)))
    .limit(1);
  if (existing) return null;
  const [created] = await db.insert(achievementsTable).values({ userId, ...def }).returning();
  return created;
}

router.get("/achievements", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const unlocked = await db.select().from(achievementsTable).where(eq(achievementsTable.userId, userId));
  const unlockedKeys = new Set(unlocked.map((a) => a.key));
  const allAchievements = ACHIEVEMENT_DEFS.map((def) => ({
    ...def,
    unlocked: unlockedKeys.has(def.key),
    unlockedAt: unlocked.find((a) => a.key === def.key)?.unlockedAt ?? null,
  }));
  res.json({ achievements: allAchievements, unlockedCount: unlocked.length, totalCount: ACHIEVEMENT_DEFS.length });
});

// ─── Daily Check-in ──────────────────────────────────────────────────────────

router.get("/checkin/today", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const today = new Date().toISOString().substring(0, 10);
  const [checkin] = await db
    .select()
    .from(dailyCheckinsTable)
    .where(and(eq(dailyCheckinsTable.userId, userId), eq(dailyCheckinsTable.checkinDate, today)))
    .limit(1);
  res.json({ checkin: checkin ?? null, today });
});

router.post("/checkin", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);
  const today = new Date().toISOString().substring(0, 10);

  const [existing] = await db
    .select()
    .from(dailyCheckinsTable)
    .where(and(eq(dailyCheckinsTable.userId, userId), eq(dailyCheckinsTable.checkinDate, today)))
    .limit(1);

  if (existing) {
    res.json({ checkin: existing, alreadyDone: true });
    return;
  }

  let healthScore = 50;
  let summary = "Your financial health looks steady today.";
  let moodEmoji = "😐";

  try {
    const scoreResult = await computeRegretScore(userId);
    healthScore = Math.max(0, Math.min(100, 100 - scoreResult.score));
    if (scoreResult.level === "low") {
      summary = `Looking great! Your finances are in good shape — savings rate ${scoreResult.savingsRate}%.`;
      moodEmoji = healthScore >= 80 ? "🌟" : "😊";
    } else if (scoreResult.level === "medium") {
      summary = `A few things to watch: ${scoreResult.factors.find((f) => f.impact === "negative")?.label ?? "spending velocity"}. Stay mindful today.`;
      moodEmoji = "😐";
    } else {
      summary = "Elevated risk today. Focus on one improvement from your rescue plan.";
      moodEmoji = "😟";
    }

    const aiClient = await getAIClient(userId);
    if (aiClient) {
      const prompt = `Write a 1-sentence personalized daily financial check-in message for someone with a ${scoreResult.level} financial risk level and ${scoreResult.savingsRate}% savings rate. Be warm, brief, and actionable. No bullet points.`;
      const resp = await aiClient.client.chat.completions.create({
        model: process.env.AI_MODEL ?? "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 60,
        temperature: 0.7,
      // maxRetries: 0 — the SDK otherwise retries a timed-out request up to
      // 2 more times before throwing, tripling the effective wait.
      }, { timeout: 12_000, maxRetries: 0 });
      // Models occasionally wrap their one-liner in quotation marks despite the
      // prompt not asking for it — strip a single matching pair if present.
      const raw = resp.choices[0]?.message?.content?.trim();
      summary = raw ? raw.replace(/^["“](.*)["”]$/s, "$1").trim() : summary;
    }
  } catch (err) {
    console.error("checkin compute error", err);
  }

  const [checkin] = await db.insert(dailyCheckinsTable).values({
    userId,
    checkinDate: today,
    healthScore,
    summary,
    moodEmoji,
  }).returning();

  const updatedStreak = await advanceStreak(userId, "checkin");

  const newAchievements: typeof achievementsTable.$inferSelect[] = [];
  if (updatedStreak.currentCount === 1) {
    const a = await unlockAchievement(userId, "first_checkin");
    if (a) newAchievements.push(a);
  }
  if (updatedStreak.currentCount >= 7) {
    const a = await unlockAchievement(userId, "streak_7");
    if (a) newAchievements.push(a);
  }
  if (updatedStreak.currentCount >= 30) {
    const a = await unlockAchievement(userId, "streak_30");
    if (a) newAchievements.push(a);
  }

  try {
    const scoreResult = await computeRegretScore(userId);
    if (scoreResult.level === "low") {
      const a = await unlockAchievement(userId, "low_regret");
      if (a) newAchievements.push(a);
    }
  } catch { }

  if (newAchievements.length > 0) {
    for (const ach of newAchievements) {
      await db.insert(alertsTable).values({
        userId,
        type: "achievement_unlocked",
        title: `🏆 Achievement Unlocked: ${ach.title}`,
        message: ach.description,
        isRead: false,
        relatedEntityType: "achievement",
        relatedEntityId: String(ach.id),
      });
    }
  }

  res.status(201).json({ checkin, streak: updatedStreak, newAchievements });
});

router.get("/checkin/history", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rows = await db
    .select()
    .from(dailyCheckinsTable)
    .where(eq(dailyCheckinsTable.userId, userId))
    .orderBy(desc(dailyCheckinsTable.checkinDate))
    .limit(30);
  res.json(rows);
});

// ─── Alerts ───────────────────────────────────────────────────────────────────

router.get("/alerts", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const rows = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.userId, userId))
    .orderBy(desc(alertsTable.createdAt))
    .limit(50);
  const unreadCount = rows.filter((r) => !r.isRead).length;
  res.json({ alerts: rows, unreadCount });
});

router.patch("/alerts/:id/read", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = parseInt(String(req.params.id), 10);
  await db
    .update(alertsTable)
    .set({ isRead: true })
    .where(and(eq(alertsTable.id, id), eq(alertsTable.userId, userId)));
  res.json({ ok: true });
});

// ─── Push Token Registration ──────────────────────────────────────────────────

router.post("/push-token", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const { token } = req.body as { token?: string };

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "InvalidToken", message: "token is required" });
    return;
  }

  await db
    .insert(pushTokensTable)
    .values({ userId, token })
    .onConflictDoUpdate({
      target: pushTokensTable.token,
      set: { userId, updatedAt: new Date() },
    });

  res.json({ ok: true });
});

router.post("/alerts/read-all", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await db
    .update(alertsTable)
    .set({ isRead: true })
    .where(eq(alertsTable.userId, userId));
  res.json({ ok: true });
});

// ─── Guardrail standing check + alert generation ─────────────────────────────

router.post("/guardrails/check-alerts", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const [guardrails, catRows] = await Promise.all([
    db.select().from(guardrailsTable).where(and(eq(guardrailsTable.userId, userId), eq(guardrailsTable.isActive, true))),
    db.select().from(categoriesTable),
  ]);

  const catMap = new Map(catRows.map((c) => [c.name.toLowerCase(), c]));
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().substring(0, 10);
  const weekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().substring(0, 10);

  const txs = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.date, monthStart), lte(transactionsTable.date, today)));

  const newAlerts: typeof alertsTable.$inferSelect[] = [];

  for (const g of guardrails) {
    const cat = catMap.get(g.categoryName.toLowerCase());
    const catId = cat?.id;
    const periodStart = g.period === "weekly" ? weekStart : monthStart;
    const spent = txs
      .filter((t) => t.type === "debit" && t.date >= periodStart && (catId ? t.categoryId === catId : true))
      .reduce((s, t) => s + parseFloat(t.amount), 0);
    const limit = parseFloat(g.limitAmount);
    const pct = limit > 0 ? (spent / limit) * 100 : 0;

    if (pct >= 100) {
      const [a] = await db.insert(alertsTable).values({
        userId,
        type: "guardrail_triggered",
        title: `🚨 Guardrail Breached: ${g.categoryName}`,
        message: `You've spent $${spent.toFixed(0)} — exceeding your $${limit.toFixed(0)} ${g.period} guardrail for ${g.categoryName}.`,
        isRead: false,
        category: g.categoryName,
        relatedEntityType: "guardrail",
        relatedEntityId: String(g.id),
      }).returning();
      newAlerts.push(a);
    } else if (pct >= 80) {
      const [a] = await db.insert(alertsTable).values({
        userId,
        type: "guardrail_warning",
        title: `⚠️ Guardrail Warning: ${g.categoryName}`,
        message: `You've used ${Math.round(pct)}% of your $${limit.toFixed(0)} ${g.period} guardrail for ${g.categoryName}. $${(limit - spent).toFixed(0)} remaining.`,
        isRead: false,
        category: g.categoryName,
        relatedEntityType: "guardrail",
        relatedEntityId: String(g.id),
      }).returning();
      newAlerts.push(a);
    }
  }

  if (newAlerts.length > 0) {
    const tokenRows = await db
      .select({ token: pushTokensTable.token })
      .from(pushTokensTable)
      .where(eq(pushTokensTable.userId, userId));

    const tokens = tokenRows.map((r) => r.token);
    if (tokens.length > 0) {
      for (const alert of newAlerts) {
        sendPushNotifications(tokens, {
          title: alert.title,
          body: alert.message,
          data: { screen: "progress", guardrailId: alert.relatedEntityId },
        }).catch((err) => console.error("[push] Notification send error", err));
      }
    }
  }

  res.json({ alertsGenerated: newAlerts.length, alerts: newAlerts });
});

export default router;
