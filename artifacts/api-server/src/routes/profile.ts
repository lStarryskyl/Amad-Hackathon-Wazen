import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userProvisioning";

const router = Router();

router.get("/profile", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const user = await getOrCreateUser(userId);
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    hasConsented: user.hasConsented,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt,
  });
});

router.put("/profile", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { name } = req.body as { name?: string };

  // Ensure user row exists before update (critical for new users)
  await getOrCreateUser(userId);

  await db
    .update(usersTable)
    .set({ name: name ?? null, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    return res.status(500).json({ error: "ServerError", message: "Failed to retrieve updated profile." });
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    hasConsented: user.hasConsented,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt,
  });
});

export default router;
