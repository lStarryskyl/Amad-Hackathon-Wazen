import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/categories", requireAuth, async (_req, res) => {
  const cats = await db.select().from(categoriesTable);
  res.json(cats);
});

export default router;
