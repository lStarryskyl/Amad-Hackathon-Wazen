/**
 * Integration tests for the Digital Twin Lab simulation flow:
 * run → list → get → delete.
 *
 * Tests spawn the pre-built API server with ENABLE_TEST_AUTH=true and
 * SKIP_AI_NARRATIVE=true, which activates an x-test-user-id header bypass for
 * Clerk auth and uses the deterministic fallback narrative instead of OpenAI.
 * Each test uses a randomly generated userId to avoid cross-test interference.
 *
 * Run with: pnpm --filter @workspace/api-server run test:simulations
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "../../dist/index.mjs");

let baseUrl = "";
let serverProcess: ChildProcess | null = null;

function uid(): string {
  return "test_" + randomBytes(8).toString("hex");
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function waitForServer(url: string, timeoutMs = 20000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/healthz`);
      if (res.status < 500) return;
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

async function startTestServer(): Promise<void> {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;

  serverProcess = spawn("node", ["--enable-source-maps", distPath], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      ENABLE_TEST_AUTH: "true",
      SKIP_AI_NARRATIVE: "true",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout?.on("data", (chunk: Buffer) => {
    const msg = chunk.toString();
    if (
      msg.includes('"level":50') ||
      msg.includes("Unhandled") ||
      msg.includes('"err"') ||
      msg.includes("ERROR")
    ) {
      process.stderr.write(`[server-out] ${msg}`);
    }
  });
  serverProcess.stderr?.on("data", (chunk: Buffer) => {
    const msg = chunk.toString();
    if (!msg.includes("telemetry") && !msg.includes("Clerk")) {
      process.stderr.write(`[server-err] ${msg}`);
    }
  });

  await waitForServer(baseUrl);
}

function stopTestServer(): void {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
}

async function api(
  method: string,
  urlPath: string,
  userId: string,
  body?: object
): Promise<{ status: number; body: any }> {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-test-user-id": userId,
    },
  };
  if (body !== undefined) {
    (init as any).body = JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${urlPath}`, init);
  let parsed: any;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail !== undefined ? `\n      ${detail}` : ""}`);
    failed++;
  }
}

function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

// ─── Test: POST /api/simulations — run scenario and check response shape ──────

async function testRunSimulation(): Promise<void> {
  section("POST /api/simulations — run scenario, verify response shape");
  const userId = uid();

  const res = await api("POST", "/api/simulations", userId, {
    scenarioName: "E2E Test Scenario",
    incomeChangePercent: 10,
    spendingChangePercent: 0,
    additionalMonthlySaving: 0,
    newMonthlyObligation: 0,
    oneTimeExpense: 0,
    timeHorizonMonths: 12,
  });

  assert(res.status === 201, "POST /api/simulations → 201 Created", `got ${res.status}`);

  const sim = res.body;
  assert(typeof sim?.id === "number", "Response has numeric id", `got: ${JSON.stringify(sim?.id)}`);
  assert(sim?.scenarioName === "E2E Test Scenario", "scenarioName matches", `got: ${sim?.scenarioName}`);
  assert(typeof sim?.inputs === "object" && sim.inputs !== null, "inputs is an object");
  assert(sim?.inputs?.incomeChangePercent === 10, "inputs.incomeChangePercent=10", `got: ${sim?.inputs?.incomeChangePercent}`);
  assert(sim?.inputs?.timeHorizonMonths === 12, "inputs.timeHorizonMonths=12", `got: ${sim?.inputs?.timeHorizonMonths}`);

  // results — hero balance fields
  const results = sim?.results;
  assert(typeof results === "object" && results !== null, "results is an object");
  assert(typeof results?.finalBalance === "number", "results.finalBalance is a number", `got: ${typeof results?.finalBalance}`);
  assert(typeof results?.startingBalance === "number", "results.startingBalance is a number");
  assert(typeof results?.totalSaved === "number", "results.totalSaved is a number");
  assert(typeof results?.finalSavingsRate === "number", "results.finalSavingsRate is a number");
  assert(typeof results?.avgMonthlySavings === "number", "results.avgMonthlySavings is a number");

  // results — chart data points
  assert(Array.isArray(results?.dataPoints), "results.dataPoints is an array");
  assert(results?.dataPoints.length >= 2, "dataPoints has at least 2 points (month 0 + final)", `got: ${results?.dataPoints.length}`);
  const dp0 = results?.dataPoints[0];
  assert(typeof dp0?.month === "number", "dataPoints[0].month is a number");
  assert(typeof dp0?.balance === "number", "dataPoints[0].balance is a number");
  assert(typeof dp0?.label === "string", "dataPoints[0].label is a string");
  assert(["low", "medium", "high"].includes(dp0?.riskLevel), "dataPoints[0].riskLevel is valid", `got: ${dp0?.riskLevel}`);

  // results — goal timelines array
  assert(Array.isArray(results?.goalTimelines), "results.goalTimelines is an array");

  // AI narrative (deterministic fallback via SKIP_AI_NARRATIVE=true)
  assert(typeof sim?.narrative === "string", "narrative is a string");
  assert((sim?.narrative as string).length > 10, "narrative is non-empty", `got: "${sim?.narrative}"`);

  assert(sim?.createdAt !== undefined, "createdAt is present");
}

// ─── Test: GET /api/simulations — list includes the newly created simulation ──

async function testListSimulations(): Promise<void> {
  section("GET /api/simulations — list reflects stored simulation");
  const userId = uid();

  // create one simulation
  const createRes = await api("POST", "/api/simulations", userId, {
    scenarioName: "List Test Scenario",
    incomeChangePercent: 5,
    spendingChangePercent: -10,
    additionalMonthlySaving: 200,
    newMonthlyObligation: 0,
    oneTimeExpense: 0,
    timeHorizonMonths: 6,
  });
  assert(createRes.status === 201, "POST /api/simulations → 201", `got ${createRes.status}`);
  const createdId: number = createRes.body?.id;

  // list
  const listRes = await api("GET", "/api/simulations", userId);
  assert(listRes.status === 200, "GET /api/simulations → 200", `got ${listRes.status}`);
  assert(Array.isArray(listRes.body), "Response is an array");
  const found = (listRes.body as any[]).find((s: any) => s.id === createdId);
  assert(found !== undefined, "Created simulation appears in list");
  assert(found?.scenarioName === "List Test Scenario", "Correct scenarioName in list");
  assert(typeof found?.results?.finalBalance === "number", "List item includes results.finalBalance");
  assert(Array.isArray(found?.results?.dataPoints), "List item includes results.dataPoints array");
  assert(typeof found?.narrative === "string", "List item includes narrative string");
}

// ─── Test: GET /api/simulations/:id — get individual simulation ───────────────

async function testGetSimulation(): Promise<void> {
  section("GET /api/simulations/:id — retrieve individual simulation");
  const userId = uid();

  const createRes = await api("POST", "/api/simulations", userId, {
    scenarioName: "Get Test Scenario",
    incomeChangePercent: 0,
    spendingChangePercent: 5,
    additionalMonthlySaving: 0,
    newMonthlyObligation: 100,
    oneTimeExpense: 500,
    timeHorizonMonths: 24,
  });
  assert(createRes.status === 201, "POST /api/simulations → 201");
  const createdId: number = createRes.body?.id;

  const getRes = await api("GET", `/api/simulations/${createdId}`, userId);
  assert(getRes.status === 200, "GET /api/simulations/:id → 200", `got ${getRes.status}`);
  assert(getRes.body?.id === createdId, "id matches");
  assert(getRes.body?.scenarioName === "Get Test Scenario", "scenarioName matches");
  assert(getRes.body?.inputs?.timeHorizonMonths === 24, "inputs.timeHorizonMonths=24", `got: ${getRes.body?.inputs?.timeHorizonMonths}`);
  assert(typeof getRes.body?.results?.finalBalance === "number", "results.finalBalance is present");
  assert(Array.isArray(getRes.body?.results?.dataPoints), "results.dataPoints is an array");

  // verify 404 for a different user
  const otherRes = await api("GET", `/api/simulations/${createdId}`, uid());
  assert(otherRes.status === 404, "GET returns 404 for wrong user");
}

// ─── Test: DELETE /api/simulations/:id — delete flow ─────────────────────────

async function testDeleteSimulation(): Promise<void> {
  section("DELETE /api/simulations/:id — delete then verify gone");
  const userId = uid();

  const createRes = await api("POST", "/api/simulations", userId, {
    scenarioName: "Delete Test Scenario",
    incomeChangePercent: -5,
    spendingChangePercent: 0,
    additionalMonthlySaving: 0,
    newMonthlyObligation: 0,
    oneTimeExpense: 0,
    timeHorizonMonths: 3,
  });
  assert(createRes.status === 201, "POST /api/simulations → 201");
  const createdId: number = createRes.body?.id;

  const delRes = await api("DELETE", `/api/simulations/${createdId}`, userId);
  assert(delRes.status === 204, "DELETE /api/simulations/:id → 204 No Content", `got ${delRes.status}`);

  const afterRes = await api("GET", `/api/simulations/${createdId}`, userId);
  assert(afterRes.status === 404, "GET after delete → 404", `got ${afterRes.status}`);

  const listRes = await api("GET", "/api/simulations", userId);
  const stillPresent = (listRes.body as any[])?.find((s: any) => s.id === createdId);
  assert(stillPresent === undefined, "Deleted simulation absent from list");

  // verify delete of wrong user's sim returns 404
  const createRes2 = await api("POST", "/api/simulations", userId, {
    scenarioName: "Not Mine",
    incomeChangePercent: 0,
    spendingChangePercent: 0,
    additionalMonthlySaving: 0,
    newMonthlyObligation: 0,
    oneTimeExpense: 0,
    timeHorizonMonths: 1,
  });
  const otherId: number = createRes2.body?.id;
  const wrongUserDel = await api("DELETE", `/api/simulations/${otherId}`, uid());
  assert(wrongUserDel.status === 404, "DELETE returns 404 when user doesn't own the simulation");
}

// ─── Test: Validation errors ──────────────────────────────────────────────────

async function testValidationErrors(): Promise<void> {
  section("POST /api/simulations — validation: missing scenarioName");
  const userId = uid();

  const noNameRes = await api("POST", "/api/simulations", userId, {
    incomeChangePercent: 10,
    timeHorizonMonths: 12,
  });
  assert(noNameRes.status === 400, "Missing scenarioName → 400 Bad Request", `got ${noNameRes.status}`);
  assert(noNameRes.body?.error === "BadRequest", "Error type is BadRequest");

  const emptyNameRes = await api("POST", "/api/simulations", userId, {
    scenarioName: "   ",
    incomeChangePercent: 10,
    timeHorizonMonths: 12,
  });
  assert(emptyNameRes.status === 400, "Whitespace-only scenarioName → 400", `got ${emptyNameRes.status}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log("Building server...");
  console.log("Starting test server...");

  try {
    await startTestServer();
    console.log(`Server ready at ${baseUrl}\n`);

    await testRunSimulation();
    await testListSimulations();
    await testGetSimulation();
    await testDeleteSimulation();
    await testValidationErrors();
  } catch (err) {
    console.error("Fatal error during tests:", err);
    failed++;
  } finally {
    stopTestServer();
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
})();
