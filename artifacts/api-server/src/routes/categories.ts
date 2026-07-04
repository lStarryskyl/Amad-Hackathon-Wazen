import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireConsent } from "../middlewares/requireConsent";

const router = Router();

router.get("/categories", requireAuth, requireConsent, async (_req, res) => {
  const cats = await db.select().from(categoriesTable);
  res.json(cats);
});

export default router;
