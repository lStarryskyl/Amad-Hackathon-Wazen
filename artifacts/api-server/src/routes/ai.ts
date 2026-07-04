import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/ai/test", requireAuth, async (_req, res) => {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return res.json({
      success: false,
      message: "OpenAI API key not configured. Please add your OPENAI_API_KEY secret.",
      model: null,
    });
  }

  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: key });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Reply with only the single word: connected" }],
      max_tokens: 10,
    });
    res.json({
      success: true,
      message: response.choices[0]?.message?.content ?? "AI service connected",
      model: response.model,
    });
  } catch (err: any) {
    res.json({
      success: false,
      message: err?.message ?? "AI service error",
      model: null,
    });
  }
});

export default router;
