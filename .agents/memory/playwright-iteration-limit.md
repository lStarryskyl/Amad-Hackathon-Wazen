---
name: Playwright iteration limit
description: The runTest() Playwright agent counts individual browser actions (each click/navigate/type), not test-plan steps, toward a hard 10-action budget. Mobile onboarding + simulation flow always exceeds this.
---

The `runTest()` testing helper enforces a hard limit of **10 total browser interactions** per run. Each individual click, navigate, or type counts as one — not each labeled `[Browser]` step.

**Why this matters for this app:**
- New Clerk user → onboarding needs ≥ 3 browser actions (Get Started → Consent → Go to Dashboard)
- Simulate tab → builder → run simulation needs ≥ 5 more actions
- Combined (8+) plus auth context and verify steps → always exceeds 10

**Workaround attempted:** DB injection via `[DB]` step to bypass onboarding and pre-seed simulations. Still failed because navigate-to-/ counts as an action, DB step also counts, and even 6 explicit plan-steps exceeded 10 when individual clicks were tallied.

**The right approach for this app:**
- For API/engine coverage: use the server integration test pattern (`ENABLE_TEST_AUTH=true` + `SKIP_AI_NARRATIVE=true`). See `artifacts/api-server/src/routes/simulations.test.ts` for the simulation flow (run → list → get → delete).
- For UI flow: keep Playwright tests to ≤ 5 browser actions total. Onboarding verification, builder UI presence, and navigation to tabs are feasible. Full simulation submit → results → delete is NOT feasible in one Playwright run with this app.

**How to apply:**
Before writing a Playwright test plan for this app, count the expected click/navigate/type actions. If > 7 (leaving budget for auth + verify), split into multiple tests or use integration tests instead.
