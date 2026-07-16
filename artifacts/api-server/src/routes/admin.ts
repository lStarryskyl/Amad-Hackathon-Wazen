/**
 * Admin-only routes — protected by the ADMIN_SECRET environment variable.
 *
 * These endpoints are not exposed to regular users and must never be mounted
 * behind Clerk's requireAuth middleware (they need to work even when a user's
 * Clerk account is gone).
 *
 * POST /admin/orphan-cleanup
 *   Scans the local users table for accounts whose Clerk identity no longer
 *   exists and purges their data.  Designed to be called periodically (e.g.
 *   from a cron job) so that a missed or failed user.deleted webhook doesn't
 *   leave financial data lingering forever.
 *
 * Query parameters:
 *   - inactiveDays (number, default 1): only consider users who have NOT made
 *     an authenticated request in the last N days.  Users active recently are
 *     skipped to avoid hammering the Clerk API for live sessions.
 *   - dryRun (boolean, default false): report what would be deleted without
 *     actually deleting anything.
 */

import { Router } from "express";
import { createClerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { lt, or, isNull } from "drizzle-orm";
import { deleteUser } from "../lib/userProvisioning";
import { logger } from "../lib/logger";

const adminRouter = Router();

/** Middleware: require the ADMIN_SECRET header. */
function requireAdminSecret(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    res.status(500).json({ error: "ADMIN_SECRET is not configured on the server" });
    return;
  }
  const provided = req.headers["x-admin-secret"];
  if (!provided || provided !== adminSecret) {
    res.status(401).json({ error: "Invalid or missing X-Admin-Secret header" });
    return;
  }
  next();
}

adminRouter.post("/admin/orphan-cleanup", requireAdminSecret, async (req, res) => {
  const rawDays = Number(req.query["inactiveDays"] ?? 1);
  const inactiveDays = Number.isFinite(rawDays) && rawDays >= 0 ? Math.max(1, rawDays) : 1;
  const dryRun = req.query["dryRun"] === "true";

  const clerkSecretKey = process.env.CLERK_SECRET_KEY ?? process.env.CLERK_SECRET_API_KEY;
  if (!clerkSecretKey) {
    res.status(500).json({ error: "CLERK_SECRET_KEY is not configured — cannot verify users against Clerk" });
    return;
  }

  const clerk = createClerkClient({ secretKey: clerkSecretKey });

  // Only consider users who haven't been active recently — recent activity
  // means they still have a valid Clerk session, so skip them.
  const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

  const candidates = await db
    .select({ id: usersTable.id, lastActiveAt: usersTable.lastActiveAt, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(
      or(
        isNull(usersTable.lastActiveAt),
        lt(usersTable.lastActiveAt, cutoff),
      ),
    );

  logger.info(
    { candidateCount: candidates.length, inactiveDays, cutoff, dryRun },
    "Orphan cleanup: scanning candidates",
  );

  const orphaned: string[] = [];
  const errors: { userId: string; error: string }[] = [];

  for (const user of candidates) {
    try {
      await clerk.users.getUser(user.id);
      // User exists in Clerk — not an orphan, skip.
    } catch (err: any) {
      const status = err?.status ?? err?.clerkError?.status;
      if (status === 404 || err?.errors?.[0]?.code === "resource_not_found") {
        // User no longer exists in Clerk.
        orphaned.push(user.id);
        if (!dryRun) {
          try {
            await deleteUser(user.id);
            logger.info({ clerkUserId: user.id }, "Orphan cleanup: deleted orphaned user data");
          } catch (deleteErr: any) {
            logger.error({ err: deleteErr, clerkUserId: user.id }, "Orphan cleanup: failed to delete user");
            errors.push({ userId: user.id, error: deleteErr?.message ?? "Unknown error" });
          }
        } else {
          logger.info({ clerkUserId: user.id }, "Orphan cleanup: would delete (dry run)");
        }
      } else {
        // Unexpected error (rate limit, network issue, etc.) — skip and log.
        logger.warn({ err, clerkUserId: user.id }, "Orphan cleanup: unexpected Clerk error, skipping");
        errors.push({ userId: user.id, error: err?.message ?? "Clerk API error" });
      }
    }
  }

  res.json({
    ok: true,
    dryRun,
    inactiveDays,
    candidatesScanned: candidates.length,
    orphansFound: orphaned.length,
    orphanedUserIds: orphaned,
    errors,
  });
});

export default adminRouter;
