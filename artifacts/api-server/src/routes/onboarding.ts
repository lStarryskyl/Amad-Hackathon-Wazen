import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userProvisioning";

const router = Router();

router.get("/onboarding", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const user = await getOrCreateUser(userId);
  let currentStep = 1;
  if (user.hasConsented) currentStep = 2;
  if (user.onboardingCompleted) currentStep = 3;
  res.json({ completed: user.onboardingCompleted, currentStep, totalSteps: 3 });
});

router.put("/onboarding", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  // Ensure user row exists before updating — critical for new users
  await getOrCreateUser(userId);

  await db
    .update(usersTable)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  res.json({ completed: true, currentStep: 3, totalSteps: 3 });
});

export default router;
