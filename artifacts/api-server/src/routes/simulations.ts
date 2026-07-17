import { Router } from "express";
import { db } from "@workspace/db";
import { simulationRunsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireConsent } from "../middlewares/requireConsent";
import { getOrCreateUser } from "../lib/userProvisioning";
import { runSimulation } from "../lib/simulationEngine";
import { generateSimulationNarrative, generateFallbackSimulationNarrative } from "../lib/aiOrchestration";
import type { ScenarioInputs } from "../lib/simulationEngine";
import {
  buildTransactionContext,
  parseScenarioPrompt,
  heuristicParseScenario,
  MAX_HORIZON_MONTHS,
} from "../lib/scenarioParsing";

const router = Router();

// POST /simulations — run a new simulation from a natural-language prompt
// (preferred) or legacy structured inputs. Forecasts are capped at 6 months.
router.post("/simulations", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  await getOrCreateUser(userId);

  const body = req.body as Partial<ScenarioInputs> & { prompt?: string; priorPrompt?: string };
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const priorPrompt = typeof body.priorPrompt === "string" ? body.priorPrompt.trim() : undefined;
  const usePrompt = prompt.length > 0;

  if (!usePrompt && (!body.scenarioName || typeof body.scenarioName !== "string" || body.scenarioName.trim().length === 0)) {
    res.status(400).json({ error: "BadRequest", message: "prompt or scenarioName is required" });
    return;
  }
  if (usePrompt && prompt.length > 300) {
    res.status(400).json({ error: "BadRequest", message: "prompt must be 300 characters or fewer" });
    return;
  }

  try {
    // Pull the user's real transaction history as grounding context.
    const context = await buildTransactionContext(userId);

    let inputs: ScenarioInputs;
    let assumptions: string[] = [];

    let aiUnavailable = false;
    if (usePrompt) {
      const skipAI = process.env.NODE_ENV !== "production" && process.env.SKIP_AI_NARRATIVE === "true";
      const parsed = skipAI
        ? heuristicParseScenario(prompt)
        : await parseScenarioPrompt(userId, prompt, context, priorPrompt);
      inputs = parsed.inputs;
      assumptions = parsed.assumptions;
      aiUnavailable = parsed.aiUnavailable;
    } else {
      inputs = {
        scenarioName: (body.scenarioName as string).trim(),
        incomeChangePercent: Number(body.incomeChangePercent) || 0,
        spendingChangePercent: Number(body.spendingChangePercent) || 0,
        additionalMonthlySaving: Math.max(0, Number(body.additionalMonthlySaving) || 0),
        newMonthlyObligation: Math.max(0, Number(body.newMonthlyObligation) || 0),
        oneTimeExpense: Math.max(0, Number(body.oneTimeExpense) || 0),
        timeHorizonMonths: Number(body.timeHorizonMonths) || MAX_HORIZON_MONTHS,
      };
    }

    // Hard cap: forecasts never exceed 6 months.
    inputs.timeHorizonMonths = Math.min(Math.max(Math.round(inputs.timeHorizonMonths) || MAX_HORIZON_MONTHS, 1), MAX_HORIZON_MONTHS);

    const results = await runSimulation(userId, inputs);
    const skipAI = process.env.NODE_ENV !== "production" && process.env.SKIP_AI_NARRATIVE === "true";
    const narrative = skipAI
      ? generateFallbackSimulationNarrative(inputs, results)
      : await generateSimulationNarrative(userId, inputs, results, { prompt: usePrompt ? prompt : undefined, context });

    const storedInputs = {
      ...inputs,
      ...(usePrompt ? { prompt } : {}),
      ...(assumptions.length ? { assumptions } : {}),
      ...(aiUnavailable ? { aiUnavailable: true } : {}),
    };

    const [saved] = await db.insert(simulationRunsTable).values({
      userId,
      scenarioName: inputs.scenarioName,
      inputs: storedInputs as any,
      results: results as any,
      narrative,
    }).returning();

    res.status(201).json({
      id: saved.id,
      scenarioName: saved.scenarioName,
      inputs: storedInputs,
      results,
      narrative,
      assumptions,
      ...(aiUnavailable ? { aiUnavailable: true } : {}),
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

// PATCH /simulations/:id — rename or annotate a simulation
router.patch("/simulations/:id", requireAuth, requireConsent, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const id = parseInt(String(req.params.id), 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "BadRequest", message: "Invalid simulation id" });
    return;
  }

  const { scenarioName, note } = req.body as { scenarioName?: string; note?: string };

  if (scenarioName !== undefined && (typeof scenarioName !== "string" || scenarioName.trim().length === 0)) {
    res.status(400).json({ error: "BadRequest", message: "scenarioName must be a non-empty string" });
    return;
  }
  if (note !== undefined && typeof note !== "string") {
    res.status(400).json({ error: "BadRequest", message: "note must be a string" });
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

    const updateFields: Record<string, unknown> = {};
    if (scenarioName !== undefined) updateFields.scenarioName = scenarioName.trim();
    if (note !== undefined) {
      const currentInputs = (row.inputs as Record<string, unknown>) ?? {};
      updateFields.inputs = { ...currentInputs, note: note.trim() };
    }

    if (Object.keys(updateFields).length === 0) {
      res.json({
        id: row.id,
        scenarioName: row.scenarioName,
        inputs: row.inputs,
        results: row.results,
        narrative: row.narrative,
        createdAt: row.createdAt,
      });
      return;
    }

    const [updated] = await db
      .update(simulationRunsTable)
      .set(updateFields as any)
      .where(eq(simulationRunsTable.id, id))
      .returning();

    res.json({
      id: updated.id,
      scenarioName: updated.scenarioName,
      inputs: updated.inputs,
      results: updated.results,
      narrative: updated.narrative,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    console.error("patch simulation error", err);
    res.status(500).json({ error: "InternalError", message: "Failed to update simulation" });
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
