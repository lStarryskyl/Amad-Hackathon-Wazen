import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userProvisioning";
import { encryptApiKey, decryptApiKey } from "../lib/encryption";

const router = Router();

// Get AI key status (never returns the key itself)
router.get("/ai/key/status", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const user = await getOrCreateUser(userId);
  res.json({
    hasUserKey: !!user.encryptedOpenAiKey,
    hasServerKey: !!process.env.AI_API_KEY,
    configuredModel: process.env.AI_MODEL ?? "gpt-4o-mini",
    configuredEndpoint: process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
  });
});

// Submit/update user's AI API key (encrypted before storage)
router.post("/ai/key", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const { apiKey } = req.body as { apiKey?: string };

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    res.status(400).json({ error: "BadRequest", message: "A valid AI API key is required." });
    return;
  }

  await getOrCreateUser(userId);

  const encrypted = encryptApiKey(apiKey.trim());
  await db.update(usersTable)
    .set({ encryptedOpenAiKey: encrypted, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  res.json({ success: true, message: "AI API key saved securely." });
});

// Remove user's stored AI API key
router.delete("/ai/key", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);

  await db.update(usersTable)
    .set({ encryptedOpenAiKey: null, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  res.json({ success: true, message: "AI API key removed." });
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

  if (!apiKey && process.env.AI_API_KEY) {
    apiKey = process.env.AI_API_KEY;
    keySource = "server";
  }

  const baseURL = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey: apiKey ?? "",
      baseURL,
    });
    const response = await client.chat.completions.create({
      model,
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