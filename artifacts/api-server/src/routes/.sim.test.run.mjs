// src/routes/simulations.test.ts
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var distPath = path.resolve(__dirname, "../../dist/index.mjs");
var baseUrl = "";
var serverProcess = null;
function uid() {
  return "test_" + randomBytes(8).toString("hex");
}
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}
async function waitForServer(url, timeoutMs = 2e4) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/healthz`);
      if (res.status < 500) return;
    } catch {
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}
async function startTestServer() {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn("node", ["--enable-source-maps", distPath], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      ENABLE_TEST_AUTH: "true",
      SKIP_AI_NARRATIVE: "true",
      PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  serverProcess.stdout?.on("data", (chunk) => {
    const msg = chunk.toString();
    if (msg.includes('"level":50') || msg.includes("Unhandled") || msg.includes('"err"') || msg.includes("ERROR")) {
      process.stderr.write(`[server-out] ${msg}`);
    }
  });
  serverProcess.stderr?.on("data", (chunk) => {
    const msg = chunk.toString();
    if (!msg.includes("telemetry") && !msg.includes("Clerk")) {
      process.stderr.write(`[server-err] ${msg}`);
    }
  });
  await waitForServer(baseUrl);
}
function stopTestServer() {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
}
async function api(method, urlPath, userId, body) {
  const init = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-test-user-id": userId
    }
  };
  if (body !== void 0) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${urlPath}`, init);
  let parsed;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed };
}
var passed = 0;
var failed = 0;
function assert(condition, label, detail) {
  if (condition) {
    console.log(`  \u2713 ${label}`);
    passed++;
  } else {
    console.error(`  \u2717 ${label}${detail !== void 0 ? `
      ${detail}` : ""}`);
    failed++;
  }
}
function section(title) {
  console.log(`
\u2500\u2500 ${title} \u2500\u2500`);
}
async function testRunSimulation() {
  section("POST /api/simulations \u2014 run scenario, verify response shape");
  const userId = uid();
  const res = await api("POST", "/api/simulations", userId, {
    scenarioName: "E2E Test Scenario",
    incomeChangePercent: 10,
    spendingChangePercent: 0,
    additionalMonthlySaving: 0,
    newMonthlyObligation: 0,
    oneTimeExpense: 0,
    timeHorizonMonths: 12
  });
  assert(res.status === 201, "POST /api/simulations \u2192 201 Created", `got ${res.status}`);
  const sim = res.body;
  assert(typeof sim?.id === "number", "Response has numeric id", `got: ${JSON.stringify(sim?.id)}`);
  assert(sim?.scenarioName === "E2E Test Scenario", "scenarioName matches", `got: ${sim?.scenarioName}`);
  assert(typeof sim?.inputs === "object" && sim.inputs !== null, "inputs is an object");
  assert(sim?.inputs?.incomeChangePercent === 10, "inputs.incomeChangePercent=10", `got: ${sim?.inputs?.incomeChangePercent}`);
  assert(sim?.inputs?.timeHorizonMonths === 6, "inputs.timeHorizonMonths capped at 6", `got: ${sim?.inputs?.timeHorizonMonths}`);
  const results = sim?.results;
  assert(typeof results === "object" && results !== null, "results is an object");
  assert(typeof results?.finalBalance === "number", "results.finalBalance is a number", `got: ${typeof results?.finalBalance}`);
  assert(typeof results?.startingBalance === "number", "results.startingBalance is a number");
  assert(typeof results?.totalSaved === "number", "results.totalSaved is a number");
  assert(typeof results?.finalSavingsRate === "number", "results.finalSavingsRate is a number");
  assert(typeof results?.avgMonthlySavings === "number", "results.avgMonthlySavings is a number");
  assert(Array.isArray(results?.dataPoints), "results.dataPoints is an array");
  assert(results?.dataPoints.length >= 2, "dataPoints has at least 2 points (month 0 + final)", `got: ${results?.dataPoints.length}`);
  const dp0 = results?.dataPoints[0];
  assert(typeof dp0?.month === "number", "dataPoints[0].month is a number");
  assert(typeof dp0?.balance === "number", "dataPoints[0].balance is a number");
  assert(typeof dp0?.label === "string", "dataPoints[0].label is a string");
  assert(["low", "medium", "high"].includes(dp0?.riskLevel), "dataPoints[0].riskLevel is valid", `got: ${dp0?.riskLevel}`);
  assert(Array.isArray(results?.goalTimelines), "results.goalTimelines is an array");
  assert(typeof sim?.narrative === "string", "narrative is a string");
  assert((sim?.narrative).length > 10, "narrative is non-empty", `got: "${sim?.narrative}"`);
  assert(sim?.createdAt !== void 0, "createdAt is present");
}
async function testListSimulations() {
  section("GET /api/simulations \u2014 list reflects stored simulation");
  const userId = uid();
  const createRes = await api("POST", "/api/simulations", userId, {
    scenarioName: "List Test Scenario",
    incomeChangePercent: 5,
    spendingChangePercent: -10,
    additionalMonthlySaving: 200,
    newMonthlyObligation: 0,
    oneTimeExpense: 0,
    timeHorizonMonths: 6
  });
  assert(createRes.status === 201, "POST /api/simulations \u2192 201", `got ${createRes.status}`);
  const createdId = createRes.body?.id;
  const listRes = await api("GET", "/api/simulations", userId);
  assert(listRes.status === 200, "GET /api/simulations \u2192 200", `got ${listRes.status}`);
  assert(Array.isArray(listRes.body), "Response is an array");
  const found = listRes.body.find((s) => s.id === createdId);
  assert(found !== void 0, "Created simulation appears in list");
  assert(found?.scenarioName === "List Test Scenario", "Correct scenarioName in list");
  assert(typeof found?.results?.finalBalance === "number", "List item includes results.finalBalance");
  assert(Array.isArray(found?.results?.dataPoints), "List item includes results.dataPoints array");
  assert(typeof found?.narrative === "string", "List item includes narrative string");
}
async function testGetSimulation() {
  section("GET /api/simulations/:id \u2014 retrieve individual simulation");
  const userId = uid();
  const createRes = await api("POST", "/api/simulations", userId, {
    scenarioName: "Get Test Scenario",
    incomeChangePercent: 0,
    spendingChangePercent: 5,
    additionalMonthlySaving: 0,
    newMonthlyObligation: 100,
    oneTimeExpense: 500,
    timeHorizonMonths: 24
  });
  assert(createRes.status === 201, "POST /api/simulations \u2192 201");
  const createdId = createRes.body?.id;
  const getRes = await api("GET", `/api/simulations/${createdId}`, userId);
  assert(getRes.status === 200, "GET /api/simulations/:id \u2192 200", `got ${getRes.status}`);
  assert(getRes.body?.id === createdId, "id matches");
  assert(getRes.body?.scenarioName === "Get Test Scenario", "scenarioName matches");
  assert(getRes.body?.inputs?.timeHorizonMonths === 6, "inputs.timeHorizonMonths capped at 6 (requested 24)", `got: ${getRes.body?.inputs?.timeHorizonMonths}`);
  assert(typeof getRes.body?.results?.finalBalance === "number", "results.finalBalance is present");
  assert(Array.isArray(getRes.body?.results?.dataPoints), "results.dataPoints is an array");
  const otherRes = await api("GET", `/api/simulations/${createdId}`, uid());
  assert(otherRes.status === 404, "GET returns 404 for wrong user");
}
async function testDeleteSimulation() {
  section("DELETE /api/simulations/:id \u2014 delete then verify gone");
  const userId = uid();
  const createRes = await api("POST", "/api/simulations", userId, {
    scenarioName: "Delete Test Scenario",
    incomeChangePercent: -5,
    spendingChangePercent: 0,
    additionalMonthlySaving: 0,
    newMonthlyObligation: 0,
    oneTimeExpense: 0,
    timeHorizonMonths: 3
  });
  assert(createRes.status === 201, "POST /api/simulations \u2192 201");
  const createdId = createRes.body?.id;
  const delRes = await api("DELETE", `/api/simulations/${createdId}`, userId);
  assert(delRes.status === 204, "DELETE /api/simulations/:id \u2192 204 No Content", `got ${delRes.status}`);
  const afterRes = await api("GET", `/api/simulations/${createdId}`, userId);
  assert(afterRes.status === 404, "GET after delete \u2192 404", `got ${afterRes.status}`);
  const listRes = await api("GET", "/api/simulations", userId);
  const stillPresent = listRes.body?.find((s) => s.id === createdId);
  assert(stillPresent === void 0, "Deleted simulation absent from list");
  const createRes2 = await api("POST", "/api/simulations", userId, {
    scenarioName: "Not Mine",
    incomeChangePercent: 0,
    spendingChangePercent: 0,
    additionalMonthlySaving: 0,
    newMonthlyObligation: 0,
    oneTimeExpense: 0,
    timeHorizonMonths: 1
  });
  const otherId = createRes2.body?.id;
  const wrongUserDel = await api("DELETE", `/api/simulations/${otherId}`, uid());
  assert(wrongUserDel.status === 404, "DELETE returns 404 when user doesn't own the simulation");
}
async function testPromptSimulation() {
  section("POST /api/simulations \u2014 natural-language prompt (heuristic fallback)");
  const userId = uid();
  const res = await api("POST", "/api/simulations", userId, {
    prompt: "What if I cut dining out by 30%?"
  });
  assert(res.status === 201, "POST with prompt \u2192 201 Created", `got ${res.status}`);
  const sim = res.body;
  assert(typeof sim?.id === "number", "Response has numeric id");
  assert(typeof sim?.scenarioName === "string" && sim.scenarioName.length > 0, "scenarioName derived from prompt", `got: ${sim?.scenarioName}`);
  assert(sim?.inputs?.prompt === "What if I cut dining out by 30%?", "inputs.prompt stored", `got: ${sim?.inputs?.prompt}`);
  assert(sim?.inputs?.timeHorizonMonths <= 6 && sim?.inputs?.timeHorizonMonths >= 1, "horizon within 1\u20136 months", `got: ${sim?.inputs?.timeHorizonMonths}`);
  assert(Array.isArray(sim?.assumptions) && sim.assumptions.length > 0, "assumptions array returned");
  assert(sim?.inputs?.spendingChangePercent < 0, "heuristic parsed a spending cut", `got: ${sim?.inputs?.spendingChangePercent}`);
  assert(Array.isArray(sim?.results?.dataPoints), "results.dataPoints is an array");
  assert(sim?.results?.dataPoints.length === sim?.inputs?.timeHorizonMonths + 1, "dataPoints match capped horizon", `got: ${sim?.results?.dataPoints.length}`);
  assert(typeof sim?.narrative === "string" && sim.narrative.length > 10, "narrative is non-empty");
  const longRes = await api("POST", "/api/simulations", userId, { prompt: "x".repeat(301) });
  assert(longRes.status === 400, "Over-long prompt \u2192 400", `got ${longRes.status}`);
}
async function testValidationErrors() {
  section("POST /api/simulations \u2014 validation: missing scenarioName");
  const userId = uid();
  const noNameRes = await api("POST", "/api/simulations", userId, {
    incomeChangePercent: 10,
    timeHorizonMonths: 12
  });
  assert(noNameRes.status === 400, "Missing scenarioName \u2192 400 Bad Request", `got ${noNameRes.status}`);
  assert(noNameRes.body?.error === "BadRequest", "Error type is BadRequest");
  const emptyNameRes = await api("POST", "/api/simulations", userId, {
    scenarioName: "   ",
    incomeChangePercent: 10,
    timeHorizonMonths: 12
  });
  assert(emptyNameRes.status === 400, "Whitespace-only scenarioName \u2192 400", `got ${emptyNameRes.status}`);
}
(async () => {
  console.log("Building server...");
  console.log("Starting test server...");
  try {
    await startTestServer();
    console.log(`Server ready at ${baseUrl}
`);
    await testRunSimulation();
    await testPromptSimulation();
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
  console.log(`
${"\u2500".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
})();
