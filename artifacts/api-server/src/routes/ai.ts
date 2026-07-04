import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userProvisioning";
import { encryptApiKey, decryptApiKey } from "../lib/encryption";

const router = Router();

// Get user's OpenAI key status (never returns the key itself)
router.get("/ai/key/status", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const user = await getOrCreateUser(userId);
  res.json({
    hasUserKey: !!user.encryptedOpenAiKey,
    hasServerKey: !!process.env.OPENAI_API_KEY,
  });
});

// Submit/update user's OpenAI API key (encrypted before storage)
router.post("/ai/key", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const { apiKey } = req.body as { apiKey?: string };

  if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("sk-")) {
    res.status(400).json({ error: "BadRequest", message: "A valid OpenAI API key (starting with sk-) is required." });
    return;
  }

  await getOrCreateUser(userId);

  const encrypted = encryptApiKey(apiKey.trim());
  await db.update(usersTable)
    .set({ encryptedOpenAiKey: encrypted, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  res.json({ success: true, message: "OpenAI API key saved securely." });
});

// Remove user's stored OpenAI API key
router.delete("/ai/key", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);

  await db.update(usersTable)
    .set({ encryptedOpenAiKey: null, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  res.json({ success: true, message: "OpenAI API key removed." });
});

// Test AI connectivity — uses user's key first, falls back to server key
router.get("/ai/test", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const user = await getOrCreateUser(userId);

  let apiKey: string | null = null;
  let keySource: "user" | "server" | null = null;

  if (user.encryptedOpenAiKey) {
    try {
      apiKey = decryptApiKey(user.encryptedOpenAiKey);
      keySource = "user";
    } catch {
      // Decryption failed — fall through to server key
    }
  }

  if (!apiKey && process.env.OPENAI_API_KEY) {
    apiKey = process.env.OPENAI_API_KEY;
    keySource = "server";
  }

  if (!apiKey) {
    res.json({
      success: false,
      message: "No OpenAI API key configured. Submit your key via POST /api/ai/key or ask your admin to set OPENAI_API_KEY.",
      model: null,
      keySource: null,
    });
    return;
  }

  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Reply with only the single word: connected" }],
      max_tokens: 10,
    });
    res.json({
      success: true,
      message: response.choices[0]?.message?.content ?? "AI service connected",
      model: response.model,
      keySource,
    });
  } catch (err: any) {
    res.json({
      success: false,
      message: (err as Error)?.message ?? "AI service error",
      model: null,
      keySource,
    });
  }
});

export default router;
