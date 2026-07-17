import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreateUser } from "../lib/userProvisioning";

const DEV_BYPASS_USER_ID = "dev-bypass-user";
// Dev fallback is active outside production so the mobile app can be tested
// without signing in (DEV_BYPASS_AUTH mode on the client sends no token).
// Production deployments set NODE_ENV=production, which disables this entirely.
const DEV_AUTH_FALLBACK = process.env.NODE_ENV !== "production";

// Single in-flight provisioning promise — all concurrent first requests await
// the same provisioning instead of racing past a boolean flag.
let devUserReady: Promise<void> | null = null;

function provisionDevUser(): Promise<void> {
  if (!devUserReady) {
    devUserReady = getOrCreateUser(DEV_BYPASS_USER_ID)
      .then(async () => {
        await db
          .update(usersTable)
          .set({ hasConsented: true })
          .where(eq(usersTable.id, DEV_BYPASS_USER_ID));
      })
      .catch((err) => {
        devUserReady = null; // allow retry on next request
        throw err;
      });
  }
  return devUserReady;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === "test" && process.env.ENABLE_TEST_AUTH === "true") {
    const testUserId = req.headers["x-test-user-id"] as string | undefined;
    if (testUserId) {
      (req as any).userId = testUserId;
      return next();
    }
  }

  const { userId } = getAuth(req);

  if (!userId && DEV_AUTH_FALLBACK) {
    (req as any).userId = DEV_BYPASS_USER_ID;
    provisionDevUser()
      .then(() => next())
      .catch((err) => {
        console.error("Dev user provisioning failed:", err);
        res.status(503).json({ error: "ServiceUnavailable", message: "Dev user setup failed; retry shortly." });
      });
    return;
  }

  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
    return;
  }
  (req as any).userId = userId as string;
  next();
};
