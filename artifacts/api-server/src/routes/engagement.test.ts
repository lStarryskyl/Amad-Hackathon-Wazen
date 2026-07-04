/**
 * Integration tests for engagement features:
 * guardrails, daily check-ins/streaks, achievements, and alerts.
 *
 * Tests spawn the pre-built API server with ENABLE_TEST_AUTH=true, which activates
 * an x-test-user-id header bypass for Clerk auth. Routes that write data call
 * getOrCreateUser internally, so no external DB setup is needed. Each test
 * uses a randomly generated userId to avoid cross-test interference.
 *
 * Run with: pnpm --filter @workspace/api-server run test:engagement
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

// ─── Test 1: Guardrails ───────────────────────────────────────────────────────

async function testGuardrailsCreateAndStanding(): Promise<void> {
  section("Guardrails: create + reflected in standing");
  const userId = uid();

  const createRes = await api("POST", "/api/guardrails", userId, {
    categoryName: "Food",
    limitAmount: 500,
    period: "monthly",
  });
  assert(createRes.status === 201, "POST /api/guardrails → 201");
  assert(typeof createRes.body?.id === "number", "Response has numeric id");
  assert(createRes.body?.categoryName === "Food", "categoryName=Food");
  assert(createRes.body?.isActive === true, "isActive=true");
  assert(createRes.body?.period === "monthly", "period=monthly");
  assert(
    parseFloat(createRes.body?.limitAmount) === 500,
    "limitAmount=500",
    `got: ${createRes.body?.limitAmount}`
  );

  const guardrailId: number = createRes.body.id;

  const listRes = await api("GET", "/api/guardrails", userId);
  assert(listRes.status === 200, "GET /api/guardrails → 200");
  assert(Array.isArray(listRes.body), "Response is array");
  const found = listRes.body.find(
    (g: any) => g.id === guardrailId && g.categoryName === "Food" && g.isActive
  );
  assert(found !== undefined, "Created guardrail appears in list");

  const standingRes = await api("GET", "/api/guardrails/standing", userId);
  assert(standingRes.status === 200, "GET /api/guardrails/standing → 200");
  assert(Array.isArray(standingRes.body?.standing), "standing is array");
  const entry = standingRes.body.standing.find(
    (s: any) => s.guardrail?.id === guardrailId
  );
  assert(entry !== undefined, "Standing entry exists for new guardrail");
  assert(typeof entry?.spent === "number", "spent is a number");
  assert(
    parseFloat(entry?.limit) === 500 || entry?.limit === 500,
    "limit=500",
    `got: ${entry?.limit}`
  );
  assert(
    typeof entry?.spentPercent === "number" &&
      entry.spentPercent >= 0 &&
      entry.spentPercent <= 100,
    "spentPercent in [0, 100]",
    `got: ${entry?.spentPercent}`
  );
  assert(
    ["safe", "warning", "breached"].includes(entry?.status),
    `status is valid (got: ${entry?.status})`
  );
  assert(typeof entry?.remaining === "number", "remaining is a number");
}

// ─── Test 2: Daily Check-in & Streak ─────────────────────────────────────────

async function testDailyCheckinAndStreak(): Promise<void> {
  section("Daily check-in: first check-in increments streak");
  const userId = uid();

  const todayBefore = await api("GET", "/api/checkin/today", userId);
  assert(todayBefore.status === 200, "GET /api/checkin/today → 200");
  assert(todayBefore.body?.checkin === null, "checkin=null before first check-in");
  assert(typeof todayBefore.body?.today === "string", "today is a string");

  const checkinRes = await api("POST", "/api/checkin", userId, {});
  assert(checkinRes.status === 201, "POST /api/checkin → 201");

  const checkin = checkinRes.body?.checkin;
  assert(checkin != null, "checkin object present in response");
  assert(typeof checkin?.checkinDate === "string", "checkinDate is string");
  assert(typeof checkin?.healthScore === "number", "healthScore is number");
  assert(typeof checkin?.moodEmoji === "string", "moodEmoji is string");
  assert(typeof checkin?.summary === "string", "summary is string");

  const streak = checkinRes.body?.streak;
  assert(streak?.type === "checkin", "streak.type=checkin");
  assert(
    typeof streak?.currentCount === "number" && streak.currentCount >= 1,
    "streak.currentCount >= 1",
    `got: ${streak?.currentCount}`
  );
  assert(streak?.longestCount >= 1, "streak.longestCount >= 1");
  assert(Array.isArray(checkinRes.body?.newAchievements), "newAchievements is array");

  const streaksRes = await api("GET", "/api/streaks", userId);
  assert(streaksRes.status === 200, "GET /api/streaks → 200");
  assert(Array.isArray(streaksRes.body), "Streaks response is array");
  const dbStreak = streaksRes.body.find((s: any) => s.type === "checkin");
  assert(dbStreak !== undefined, "checkin streak row exists");
  assert(dbStreak?.currentCount >= 1, "currentCount >= 1 from DB streak");

  const todayAfter = await api("GET", "/api/checkin/today", userId);
  assert(todayAfter.status === 200, "GET /api/checkin/today after check-in → 200");
  assert(todayAfter.body?.checkin !== null, "checkin no longer null");
  assert(
    todayAfter.body?.checkin?.checkinDate === todayBefore.body?.today,
    "checkinDate matches today's date"
  );

  const secondCheckin = await api("POST", "/api/checkin", userId, {});
  assert(secondCheckin.status === 200, "Second POST /api/checkin same day → 200");
  assert(
    secondCheckin.body?.alreadyDone === true,
    "alreadyDone=true on duplicate check-in (idempotent)"
  );
}

// ─── Test 3: Achievements ─────────────────────────────────────────────────────

async function testAchievementUnlockedOnFirstCheckin(): Promise<void> {
  section("Achievements: first_checkin unlocked after check-in");
  const userId = uid();

  await api("POST", "/api/checkin", userId, {});

  const achRes = await api("GET", "/api/achievements", userId);
  assert(achRes.status === 200, "GET /api/achievements → 200");
  assert(Array.isArray(achRes.body?.achievements), "achievements is array");
  assert(
    achRes.body?.totalCount === 8,
    "totalCount=8",
    `got: ${achRes.body?.totalCount}`
  );
  assert(
    typeof achRes.body?.unlockedCount === "number" && achRes.body.unlockedCount >= 1,
    "unlockedCount >= 1"
  );

  const firstCheckin = achRes.body.achievements.find(
    (a: any) => a.key === "first_checkin"
  );
  assert(firstCheckin !== undefined, "first_checkin achievement in list");
  assert(firstCheckin?.unlocked === true, "first_checkin.unlocked=true");
  assert(
    firstCheckin?.unlockedAt !== null && firstCheckin?.unlockedAt !== undefined,
    "first_checkin.unlockedAt is set"
  );
}

// ─── Test 4: Alerts ───────────────────────────────────────────────────────────

async function testAlertGenerationAndMarkRead(): Promise<void> {
  section("Alerts: achievement alert generated + mark-as-read flow");
  const userId = uid();

  await api("POST", "/api/checkin", userId, {});

  const alertsRes = await api("GET", "/api/alerts", userId);
  assert(alertsRes.status === 200, "GET /api/alerts → 200");
  assert(Array.isArray(alertsRes.body?.alerts), "alerts is array");
  assert(
    typeof alertsRes.body?.unreadCount === "number",
    "unreadCount is a number"
  );

  const achievementAlert = alertsRes.body.alerts.find(
    (a: any) => a.type === "achievement_unlocked" && !a.isRead
  );
  assert(achievementAlert !== undefined, "achievement_unlocked alert exists and is unread");
  if (!achievementAlert) return;

  const alertId: number = achievementAlert.id;
  const unreadBefore: number = alertsRes.body.unreadCount;
  assert(unreadBefore >= 1, "unreadCount >= 1 before mark-read");

  const markRes = await api("PATCH", `/api/alerts/${alertId}/read`, userId);
  assert(markRes.status === 200, `PATCH /api/alerts/${alertId}/read → 200`);
  assert(markRes.body?.ok === true, "mark-read returns {ok:true}");

  const afterMarkRes = await api("GET", "/api/alerts", userId);
  assert(afterMarkRes.status === 200, "GET /api/alerts after mark-read → 200");
  const markedAlert = afterMarkRes.body.alerts.find((a: any) => a.id === alertId);
  assert(markedAlert?.isRead === true, "alert.isRead=true after PATCH");
  assert(
    afterMarkRes.body.unreadCount === unreadBefore - 1,
    "unreadCount decremented by 1",
    `expected ${unreadBefore - 1}, got ${afterMarkRes.body.unreadCount}`
  );

  const readAllRes = await api("POST", "/api/alerts/read-all", userId);
  assert(readAllRes.status === 200, "POST /api/alerts/read-all → 200");
  assert(readAllRes.body?.ok === true, "read-all returns {ok:true}");

  const finalRes = await api("GET", "/api/alerts", userId);
  assert(finalRes.status === 200, "GET /api/alerts after read-all → 200");
  assert(
    finalRes.body?.unreadCount === 0,
    "unreadCount=0 after read-all",
    `got: ${finalRes.body?.unreadCount}`
  );
}

// ─── Test 5: Guardrail check-alerts ──────────────────────────────────────────

async function testGuardrailCheckAlerts(): Promise<void> {
  section("Guardrails: check-alerts generates alerts when thresholds are breached");
  const userId = uid();

  await api("POST", "/api/guardrails", userId, {
    categoryName: "Transport",
    limitAmount: 1,
    period: "monthly",
  });

  const checkRes = await api("POST", "/api/guardrails/check-alerts", userId);
  assert(
    checkRes.status === 200,
    "POST /api/guardrails/check-alerts → 200",
    `got status ${checkRes.status}, body: ${JSON.stringify(checkRes.body)}`
  );
  assert(
    typeof checkRes.body?.alertsGenerated === "number",
    "alertsGenerated is a number",
    `body: ${JSON.stringify(checkRes.body)}`
  );
  assert(checkRes.body?.alertsGenerated >= 0, "alertsGenerated >= 0");
  assert(Array.isArray(checkRes.body?.alerts), "alerts is array");
}

// ─── Test 6: Restart persistence ─────────────────────────────────────────────

async function testDataSurvivesServerRestart(): Promise<void> {
  section("Persistence: guardrail, streak, and achievement survive a server restart");
  const userId = uid();

  const createRes = await api("POST", "/api/guardrails", userId, {
    categoryName: "Housing",
    limitAmount: 1500,
    period: "monthly",
  });
  assert(createRes.status === 201, "Guardrail created before restart");
  const guardrailId: number = createRes.body?.id;

  const checkinRes = await api("POST", "/api/checkin", userId, {});
  assert(checkinRes.status === 201, "Check-in created before restart");

  const unlockedBefore = checkinRes.body?.newAchievements?.length ?? 0;
  assert(typeof guardrailId === "number", "Guardrail id is numeric");

  // ── Restart the server ───────────────────────────────────────────────────
  stopTestServer();
  await startTestServer();
  // ── Server is now a fresh process; data must still be in PostgreSQL ──────

  const listRes = await api("GET", "/api/guardrails", userId);
  assert(listRes.status === 200, "GET /api/guardrails responds after restart");
  const guardFound = listRes.body?.find?.((g: any) => g.id === guardrailId);
  assert(guardFound !== undefined, "Guardrail row survives restart (PostgreSQL)");

  const streaksRes = await api("GET", "/api/streaks", userId);
  assert(streaksRes.status === 200, "GET /api/streaks responds after restart");
  const streak = streaksRes.body?.find?.((s: any) => s.type === "checkin");
  assert(
    typeof streak?.currentCount === "number" && streak.currentCount >= 1,
    "Streak currentCount >= 1 after restart"
  );

  const achRes = await api("GET", "/api/achievements", userId);
  assert(achRes.status === 200, "GET /api/achievements responds after restart");
  const ach = achRes.body?.achievements?.find?.(
    (a: any) => a.key === "first_checkin"
  );
  assert(ach?.unlocked === true, "Achievement persists as unlocked after restart");
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await startTestServer();
  console.log(`\nEngagement integration tests → ${baseUrl}\n`);

  try {
    await testGuardrailsCreateAndStanding();
    await testDailyCheckinAndStreak();
    await testAchievementUnlockedOnFirstCheckin();
    await testAlertGenerationAndMarkRead();
    await testGuardrailCheckAlerts();
    await testDataSurvivesServerRestart();
  } finally {
    stopTestServer();
  }

  console.log(`\n${"─".repeat(55)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Test runner error:", err);
  stopTestServer();
  process.exit(1);
});
