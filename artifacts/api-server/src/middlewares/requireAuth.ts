import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === "test" && process.env.ENABLE_TEST_AUTH === "true") {
    const testUserId = req.headers["x-test-user-id"] as string | undefined;
    if (testUserId) {
      (req as any).userId = testUserId;
      return next();
    }
  }

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
    return;
  }
  (req as any).userId = userId as string;
  next();
};
