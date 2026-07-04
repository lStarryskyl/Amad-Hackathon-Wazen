import { Router } from "express";
import { db } from "@workspace/db";
import { simulationRunsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireConsent } from "../middlewares/requireConsent";
import { getOrCreateUser } from "../lib/userProvisioning";
import { runSimulation } from "../lib/simulationEngine";
import { generateSimulationNarrative } from "../lib/aiOrchestration";
import type { ScenarioInputs } from "../lib/simulationEngine";

const router = Router();

// POST /simulations — run a new simulation
router.post("/simulations", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);

  const {
    scenarioName,
    incomeChangePercent = 0,
    spendingChangePercent = 0,
    additionalMonthlySaving = 0,
    newMonthlyObligation = 0,
    oneTimeExpense = 0,
    timeHorizonMonths = 12,
  } = req.body as Partial<ScenarioInputs>;

  if (!scenarioName || typeof scenarioName !== "string" || scenarioName.trim().length === 0) {
    res.status(400).json({ error: "BadRequest", message: "scenarioName is required" });
    return;
  }

  const safeHorizon = Math.min(Math.max(Number(timeHorizonMonths) || 12, 1), 60);

  const inputs: ScenarioInputs = {
    scenarioName: scenarioName.trim(),
    incomeChangePercent: Number(incomeChangePercent) || 0,
    spendingChangePercent: Number(spendingChangePercent) || 0,
    additionalMonthlySaving: Math.max(0, Number(additionalMonthlySaving) || 0),
    newMonthlyObligation: Math.max(0, Number(newMonthlyObligation) || 0),
    oneTimeExpense: Math.max(0, Number(oneTimeExpense) || 0),
    timeHorizonMonths: safeHorizon,
  };

  try {
    const results = await runSimulation(userId, inputs);
    const narrative = await generateSimulationNarrative(userId, inputs, results);

    const [saved] = await db.insert(simulationRunsTable).values({
      userId,
      scenarioName: inputs.scenarioName,
      inputs: inputs as any,
      results: results as any,
      narrative,
    }).returning();

    res.status(201).json({
      id: saved.id,
      scenarioName: saved.scenarioName,
      inputs,
      results,
      narrative,
      createdAt: saved.createdAt,
    });
  } catch (err) {
    console.error("simulation error", err);
    res.status(500).json({ error: "InternalError", message: "Failed to run simulation" });
  }
});

// GET /simulations — list all simulations for the user
router.get("/simulations", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  try {
    const rows = await db
      .select()
      .from(simulationRunsTable)
      .where(eq(simulationRunsTable.userId, userId))
      .orderBy(desc(simulationRunsTable.createdAt))
      .limit(50);

    res.json(rows.map((r) => ({
      id: r.id,
      scenarioName: r.scenarioName,
      inputs: r.inputs,
      results: r.results,
      narrative: r.narrative,
      createdAt: r.createdAt,
    })));
  } catch (err) {
    console.error("list simulations error", err);
    res.status(500).json({ error: "InternalError", message: "Failed to list simulations" });
  }
});

// GET /simulations/:id — get a single simulation
router.get("/simulations/:id", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = parseInt(String(req.params.id), 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "BadRequest", message: "Invalid simulation id" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(simulationRunsTable)
      .where(eq(simulationRunsTable.id, id))
      .limit(1);

    if (!row || row.userId !== userId) {
      res.status(404).json({ error: "NotFound", message: "Simulation not found" });
      return;
    }

    res.json({
      id: row.id,
      scenarioName: row.scenarioName,
      inputs: row.inputs,
      results: row.results,
      narrative: row.narrative,
      createdAt: row.createdAt,
    });
  } catch (err) {
    console.error("get simulation error", err);
    res.status(500).json({ error: "InternalError", message: "Failed to get simulation" });
  }
});

// DELETE /simulations/:id — delete a simulation
router.delete("/simulations/:id", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = parseInt(String(req.params.id), 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "BadRequest", message: "Invalid simulation id" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(simulationRunsTable)
      .where(eq(simulationRunsTable.id, id))
      .limit(1);

    if (!row || row.userId !== userId) {
      res.status(404).json({ error: "NotFound", message: "Simulation not found" });
      return;
    }

    await db.delete(simulationRunsTable).where(eq(simulationRunsTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error("delete simulation error", err);
    res.status(500).json({ error: "InternalError", message: "Failed to delete simulation" });
  }
});

export default router;
