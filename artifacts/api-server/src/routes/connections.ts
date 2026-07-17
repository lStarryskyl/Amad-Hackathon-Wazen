import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireConsent } from "../middlewares/requireConsent";
import { getOrCreateUser } from "../lib/userProvisioning";

const router = Router();

/**
 * GET /api/connections
 * Lists connected data sources, grouped by institution.
 */
router.get("/connections", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);

  const accounts = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.userId, userId), eq(accountsTable.isActive, true)));

  const byInstitution = new Map<
    string,
    {
      institutionName: string;
      accounts: {
        id: number;
        accountName: string;
        accountType: string;
        balance: string;
        currency: string;
        createdAt: Date | null;
      }[];
      connectedAt: Date | null;
    }
  >();

  for (const acc of accounts) {
    const key = acc.institutionName;
    if (!byInstitution.has(key)) {
      byInstitution.set(key, {
        institutionName: key,
        accounts: [],
        connectedAt: acc.createdAt,
      });
    }
    const entry = byInstitution.get(key)!;
    entry.accounts.push({
      id: acc.id,
      accountName: acc.accountName,
      accountType: acc.accountType,
      balance: acc.balance,
      currency: acc.currency,
      createdAt: acc.createdAt,
    });
    if (acc.createdAt && (!entry.connectedAt || acc.createdAt < entry.connectedAt)) {
      entry.connectedAt = acc.createdAt;
    }
  }

  res.json({ connections: Array.from(byInstitution.values()) });
});

/**
 * DELETE /api/connections/:institution
 * Revokes a bank connection: deactivates all of the user's accounts
 * belonging to the given institution (URL-encoded institution name).
 */
router.delete("/connections/:institution", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const institution = decodeURIComponent(String(req.params.institution));

  const updated = await db
    .update(accountsTable)
    .set({ isActive: false })
    .where(
      and(
        eq(accountsTable.userId, userId),
        eq(accountsTable.institutionName, institution),
        eq(accountsTable.isActive, true),
      ),
    )
    .returning({ id: accountsTable.id });

  if (updated.length === 0) {
    res.status(404).json({ error: "Not found", message: "No active connection found for this institution" });
    return;
  }

  res.json({
    disconnected: true,
    institutionName: institution,
    accountsDisconnected: updated.length,
  });
});

export default router;
