import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export const requireConsent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { userId } = getAuth(req);
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
