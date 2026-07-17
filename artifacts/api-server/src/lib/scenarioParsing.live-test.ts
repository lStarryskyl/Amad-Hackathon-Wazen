/**
 * Live AI prompt-parser validation script.
 *
 * Starts the built API server WITHOUT SKIP_AI_NARRATIVE so the real LLM path
 * is exercised, then sends representative what-if prompts and asserts that the
 * returned ScenarioInputs are properly clamped and sane.
 *
 * Prerequisites: `pnpm run build` has been run.
 *
 * Run with:
 *   pnpm --filter @workspace/api-server run test:ai-parsing
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "../../dist/index.mjs");

const MAX_HORIZON_MONTHS = 6;

// ── Server lifecycle ───────────────────────────────────────────────────────────

let baseUrl = "";
let serverProcess: ChildProcess | null = null;

function uid(): string {
  return "aitest_" + randomBytes(6).toString("hex");
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

async function waitForServer(url: string, timeoutMs = 25000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/healthz`);
      if (res.status < 500) return;
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 300));
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
      // Intentionally NOT setting SKIP_AI_NARRATIVE — this exercises the live AI path
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stderr?.on("data", (chunk: Buffer) => {
    const msg = chunk.toString();
    if (!msg.includes("telemetry") && !msg.includes("Clerk") && !msg.includes("ExperimentalWarning")) {
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

async function api(userId: string, body: object): Promise<{ status: number; body: any }> {
  const res = await fetch(`${baseUrl}/api/simulations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-user-id": userId },
    body: JSON.stringify(body),
  });
  let parsed: any;
  try { parsed = await res.json(); } catch { parsed = null; }
  return { status: res.status, body: parsed };
}

// ── Assertions ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: unknown): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail !== undefined ? `\n    detail: ${JSON.stringify(detail)}` : ""}`);
    failed++;
  }
}

function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

function assertClamped(label: string, inputs: any): void {
  assert(typeof inputs.incomeChangePercent === "number" && inputs.incomeChangePercent >= -50 && inputs.incomeChangePercent <= 100,
    `${label}: incomeChangePercent in [-50,100]`, inputs.incomeChangePercent);
  assert(typeof inputs.spendingChangePercent === "number" && inputs.spendingChangePercent >= -60 && inputs.spendingChangePercent <= 60,
    `${label}: spendingChangePercent in [-60,60]`, inputs.spendingChangePercent);
  assert(typeof inputs.additionalMonthlySaving === "number" && inputs.additionalMonthlySaving >= 0,
    `${label}: additionalMonthlySaving ≥ 0`, inputs.additionalMonthlySaving);
  assert(typeof inputs.newMonthlyObligation === "number" && inputs.newMonthlyObligation >= 0,
    `${label}: newMonthlyObligation ≥ 0`, inputs.newMonthlyObligation);
  assert(typeof inputs.oneTimeExpense === "number" && inputs.oneTimeExpense >= 0,
    `${label}: oneTimeExpense ≥ 0`, inputs.oneTimeExpense);
  assert(typeof inputs.timeHorizonMonths === "number" && inputs.timeHorizonMonths >= 1 && inputs.timeHorizonMonths <= MAX_HORIZON_MONTHS,
    `${label}: timeHorizonMonths in [1,${MAX_HORIZON_MONTHS}]`, inputs.timeHorizonMonths);
  assert(Number.isInteger(inputs.timeHorizonMonths),
    `${label}: timeHorizonMonths is integer`, inputs.timeHorizonMonths);
  assert(typeof inputs.scenarioName === "string" && inputs.scenarioName.length > 0,
    `${label}: scenarioName non-empty`);
  assert(inputs.scenarioName.length <= 60,
    `${label}: scenarioName ≤ 60 chars`, inputs.scenarioName.length);
}

// ── JSON extraction unit tests (inline, no imports needed) ─────────────────────

function testJsonExtraction(): void {
  section("JSON extraction robustness (unit-level)");

  function extractJson(raw: string): Record<string, unknown> | null {
    try {
      const stripped = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
      const objStart = stripped.indexOf("{");
      const objEnd = stripped.lastIndexOf("}");
      if (objStart === -1 || objEnd === -1 || objEnd < objStart) return null;
      return JSON.parse(stripped.slice(objStart, objEnd + 1));
    } catch { return null; }
  }

  const bare = `{"scenarioName":"test","incomeChangePercent":10,"spendingChangePercent":0,"additionalMonthlySaving":0,"newMonthlyObligation":0,"oneTimeExpense":0,"timeHorizonMonths":3,"assumptions":["10% raise applied"]}`;

  assert(extractJson(bare) !== null, "bare JSON parses");
  assert(extractJson("```json\n" + bare + "\n```") !== null, "```json fenced JSON parses");
  assert(extractJson("```\n" + bare + "\n```") !== null, "plain ``` fenced JSON parses");
  assert(extractJson("Here is the JSON:\n" + bare) !== null, "preamble text before JSON parses");
  assert(extractJson("Sure!\n```json\n" + bare + "\n```\nLet me know!") !== null, "preamble + fences + trailing text parses");
  assert(extractJson("No JSON here at all") === null, "non-JSON returns null (triggers fallback)");
  assert(extractJson("") === null, "empty string returns null");
}

// ── Live AI prompt test cases ──────────────────────────────────────────────────

interface TestCase {
  prompt: string;
  check: (sim: any) => void;
}

const TEST_CASES: TestCase[] = [
  {
    // Income change
    prompt: "What if I get a 15% raise next month?",
    check: (sim) => {
      assert(sim.inputs.incomeChangePercent > 0,
        "15% raise → positive incomeChangePercent", sim.inputs.incomeChangePercent);
      assert(Array.isArray(sim.assumptions) && sim.assumptions.length > 0,
        "assumptions returned");
    },
  },
  {
    // Category-relative spending cut — model must translate 30% dining cut to
    // a proportional spendingChangePercent based on context history
    prompt: "What if I cut dining out by 30%?",
    check: (sim) => {
      assert(sim.inputs.spendingChangePercent < 0,
        "dining cut → negative spendingChangePercent", sim.inputs.spendingChangePercent);
      assert(Array.isArray(sim.assumptions) && sim.assumptions.length > 0,
        "assumptions explain the estimate");
    },
  },
  {
    // Monthly saving
    prompt: "What if I save an extra $500 a month?",
    check: (sim) => {
      assert(sim.inputs.additionalMonthlySaving > 0,
        "extra saving → additionalMonthlySaving > 0", sim.inputs.additionalMonthlySaving);
    },
  },
  {
    // Long horizon → must be capped at 6 months
    prompt: "What if I cut subscriptions by 20% over the next 2 years?",
    check: (sim) => {
      assert(sim.inputs.timeHorizonMonths <= MAX_HORIZON_MONTHS,
        "2-year horizon capped at 6 months", sim.inputs.timeHorizonMonths);
      assert(sim.inputs.spendingChangePercent < 0,
        "subscription cut → negative spendingChangePercent", sim.inputs.spendingChangePercent);
    },
  },
  {
    // Extreme value — model may return -100; clamping must bring it to -50
    prompt: "What if I lose my entire income completely?",
    check: (sim) => {
      assert(sim.inputs.incomeChangePercent >= -50,
        "total income loss clamped to -50", sim.inputs.incomeChangePercent);
    },
  },
];

async function testLiveAIPrompts(): Promise<void> {
  // Check if AI key is available by inspecting the healthz response and
  // making one test call; if the server falls back to heuristic (aiUnavailable
  // from heuristic) we still validate shape — but we note the key was missing.
  const userId = uid();
  let aiWorking = false;

  for (const tc of TEST_CASES) {
    section(`prompt: "${tc.prompt.slice(0, 72)}"`);

    let res: { status: number; body: any };
    try {
      res = await api(userId, { prompt: tc.prompt });
    } catch (err) {
      assert(false, "API call did not throw", String(err));
      continue;
    }

    assert(res.status === 201, "POST with prompt → 201 Created", `got ${res.status}`);
    if (res.status !== 201) continue;

    const sim = res.body;
    console.log(`    aiUnavailable=${sim?.inputs?.aiUnavailable ?? "n/a"}  scenarioName="${sim?.inputs?.scenarioName}"`);
    console.log(`    income=${sim?.inputs?.incomeChangePercent}%  spending=${sim?.inputs?.spendingChangePercent}%  saving=$${sim?.inputs?.additionalMonthlySaving}  obligation=$${sim?.inputs?.newMonthlyObligation}  oneTime=$${sim?.inputs?.oneTimeExpense}  horizon=${sim?.inputs?.timeHorizonMonths}`);
    console.log(`    assumptions: ${JSON.stringify(sim?.assumptions)}`);
    console.log(`    narrative length: ${typeof sim?.narrative === "string" ? sim.narrative.length : "n/a"} chars`);

    // Universal shape invariants
    assert(typeof sim?.id === "number", "response has numeric id");
    assert(Array.isArray(sim?.results?.dataPoints), "results.dataPoints is an array");
    assert(typeof sim?.narrative === "string" && sim.narrative.length > 10, "narrative is non-empty");
    assert(sim?.inputs?.timeHorizonMonths <= MAX_HORIZON_MONTHS, "horizon ≤ 6 globally", sim?.inputs?.timeHorizonMonths);
    assert(sim?.results?.dataPoints?.length === (sim?.inputs?.timeHorizonMonths ?? 0) + 1,
      "dataPoints count matches horizon + 1 (month 0)", sim?.results?.dataPoints?.length);

    assertClamped(tc.prompt.slice(0, 30), sim?.inputs);
    tc.check(sim);

    // Track if we're getting real AI responses (not heuristic fallback)
    if (!sim?.inputs?.aiUnavailable) aiWorking = true;
  }

  if (aiWorking) {
    console.log("\n✓ Real AI path confirmed active — responses came from the configured model.");
  } else {
    console.warn("\n⚠  All responses came from the heuristic fallback — AI_API_KEY may be missing or model unreachable.");
    console.warn("   Shape invariants still validated; set AI_API_KEY to test the live AI path.");
  }
}

// ── Over-long prompt (validation, no AI) ──────────────────────────────────────

async function testValidation(): Promise<void> {
  section("Validation — over-long prompt → 400");
  const userId = uid();
  const res = await api(userId, { prompt: "x".repeat(301) });
  assert(res.status === 400, "301-char prompt → 400 Bad Request", `got ${res.status}`);
}

// ── Main ───────────────────────────────────────────────────────────────────────

(async () => {
  console.log("=== scenarioParsing — live AI validation ===\n");

  // Unit-level extraction tests (no server needed)
  testJsonExtraction();

  console.log("\nBuilding and starting test server (AI enabled)...");
  try {
    await startTestServer();
    console.log(`Server ready at ${baseUrl}\n`);

    await testLiveAIPrompts();
    await testValidation();
  } catch (err) {
    console.error("Fatal error:", err);
    failed++;
  } finally {
    stopTestServer();
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
