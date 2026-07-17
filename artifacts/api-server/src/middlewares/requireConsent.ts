import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export const requireConsent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (process.env.NODE_ENV === "test" && process.env.ENABLE_TEST_AUTH === "true") {
    const testUserId = req.headers["x-test-user-id"] as string | undefined;
    if (testUserId) {
      return next();
    }
  }

  // Prefer the userId already resolved by requireAuth (covers dev bypass).
  const userId = (req as any).userId ?? getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
    return;
  }

  const [user] = await db
    .select({ hasConsented: usersTable.hasConsented })
    .from(usersTable)
    .where(eq(usersTable.id, userId as string))
    .limit(1);

  if (!user || !user.hasConsented) {
    res.status(403).json({
      error: "ConsentRequired",
      message: "Privacy consent is required before accessing financial data. Please complete onboarding.",
    });
    return;
  }

  next();
};
