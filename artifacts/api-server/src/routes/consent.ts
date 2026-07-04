import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, consentRecordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userProvisioning";

const router = Router();

router.get("/consent", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const user = await getOrCreateUser(userId);
  res.json({ hasConsented: user.hasConsented, consentGivenAt: user.consentGivenAt });
});

router.post("/consent/accept", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const now = new Date();

  await Promise.all([
    db
      .update(usersTable)
      .set({ hasConsented: true, consentGivenAt: now, updatedAt: now })
      .where(eq(usersTable.id, userId)),
    db.insert(consentRecordsTable).values({ userId, version: "1.0" }),
  ]);

  res.json({ hasConsented: true, consentGivenAt: now });
});

export default router;
