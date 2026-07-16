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
 *     skipped to avoid hammering the Clerk API for live sessions.  Set to 0
 *     for aggressive cleanup: EVERY user is checked against Clerk regardless
 *     of recent activity.  This catches the "signed up and deleted the account
 *     seconds later" case, where lastActiveAt is fresh but the Clerk identity
 *     is already gone.  Safe because a user is only purged when Clerk returns
 *     404 for their id — live sessions are never deleted.
 *   - dryRun (boolean, default false): report what would be deleted without
 *     actually deleting anything.
 *
 * Partial onboarding: users whose onboardingCompleted flag is still false are
 * ALWAYS included as candidates (after a 10-minute grace period from account
 * creation), even if they were active within the inactiveDays window.  A user
 * who deletes their account mid-onboarding leaves seeded demo data plus
 * partial records behind; because their lastActiveAt is recent, the normal
 * inactivity filter would skip them until the window closes.  The grace
 * period avoids hammering the Clerk API for users who are actively signing up
 * right now.
 */

import { Router } from "express";
import { createClerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { and, eq, lt, or, isNull } from "drizzle-orm";
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
  // inactiveDays=0 is allowed: it means "check every user against Clerk now",
  // useful for aggressive cleanup of accounts deleted seconds after signup.
  const rawDays = Number(req.query["inactiveDays"] ?? 1);
  const inactiveDays = Number.isFinite(rawDays) && rawDays >= 0 ? rawDays : 1;
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

  // Grace period for the partial-onboarding branch: don't check users who
  // created their account within the last 10 minutes — they're likely still
  // signing up right now.
  const onboardingGraceCutoff = new Date(Date.now() - 10 * 60 * 1000);

  const candidates = await db
    .select({
      id: usersTable.id,
      lastActiveAt: usersTable.lastActiveAt,
      createdAt: usersTable.createdAt,
      onboardingCompleted: usersTable.onboardingCompleted,
    })
    .from(usersTable)
    .where(
      or(
        isNull(usersTable.lastActiveAt),
        lt(usersTable.lastActiveAt, cutoff),
        // Partial onboarding: recently-active users normally get skipped, but
        // if onboarding never completed and the account is >10 minutes old,
        // verify against Clerk anyway — a user who deleted their account
        // mid-onboarding leaves seeded demo data behind.
        and(
          eq(usersTable.onboardingCompleted, false),
          lt(usersTable.createdAt, onboardingGraceCutoff),
        ),
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
