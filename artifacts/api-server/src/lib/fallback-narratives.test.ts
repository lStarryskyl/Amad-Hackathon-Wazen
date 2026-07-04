import { generateFallbackMoneyStory, generateFallbackRescueNarrative } from "./fallbackNarratives.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`);
    failed++;
  }
}

function assertNoUndefined(text: string, label: string) {
  assert(!text.includes("undefined"), label, `Got: "${text}"`);
}

function assertNoNaN(text: string, label: string) {
  assert(!text.includes("NaN"), label, `Got: "${text}"`);
}

function section(title: string) {
  console.log(`\n── ${title} ──`);
}

// ─── generateFallbackMoneyStory ───────────────────────────────────────────────

section("generateFallbackMoneyStory — zero months (empty array)");
{
  const result = generateFallbackMoneyStory("May 2026", { monthlyBreakdowns: [], recurringObligationsTotal: 0 });
  assertNoUndefined(result, "No undefined in output");
  assertNoNaN(result, "No NaN in output");
  assert(result.length > 20, "Returns non-empty message");
  assert(!result.includes("steady discipline") && !result.includes("improving discipline"), "Does not claim trend for zero data");
}

section("generateFallbackMoneyStory — zero months (missing key)");
{
  const result = generateFallbackMoneyStory("May 2026", { recurringObligationsTotal: 0 });
  assertNoUndefined(result, "No undefined in output");
  assertNoNaN(result, "No NaN in output");
  assert(result.length > 20, "Returns non-empty message");
}

section("generateFallbackMoneyStory — one month, zero income (brand-new user)");
{
  const result = generateFallbackMoneyStory("May 2026", {
    monthlyBreakdowns: [{ month: "May 2026", income: 0, expenses: 0, savingsRate: 0 }],
    recurringObligationsTotal: 0,
  });
  assertNoUndefined(result, "No undefined in output");
  assertNoNaN(result, "No NaN in output");
  assert(!result.includes("steady discipline"), "Does not say 'steady discipline' for zero-income user");
  assert(!result.includes("improving discipline"), "Does not say 'improving discipline' for zero-income user");
}

section("generateFallbackMoneyStory — one month, real data");
{
  const result = generateFallbackMoneyStory("May 2026", {
    monthlyBreakdowns: [{ month: "May 2026", income: 4000, expenses: 3000, savingsRate: 25 }],
    recurringObligationsTotal: 800,
  });
  assertNoUndefined(result, "No undefined in output");
  assertNoNaN(result, "No NaN in output");
  assert(result.includes("25%"), "Includes savings rate");
  assert(!result.includes("breakdowns["), "No raw code leaked into output");
}

section("generateFallbackMoneyStory — one month, low savings rate");
{
  const result = generateFallbackMoneyStory("May 2026", {
    monthlyBreakdowns: [{ month: "May 2026", income: 4000, expenses: 3900, savingsRate: 2 }],
    recurringObligationsTotal: 1200,
  });
  assertNoUndefined(result, "No undefined in output");
  assertNoNaN(result, "No NaN in output");
  assert(result.includes("room to grow"), "Surfaces 'room to grow' for low savings rate");
}

section("generateFallbackMoneyStory — three months, improving trend");
{
  const result = generateFallbackMoneyStory("March 2026 — May 2026", {
    monthlyBreakdowns: [
      { month: "March 2026", income: 4000, expenses: 3600, savingsRate: 10 },
      { month: "April 2026", income: 4200, expenses: 3500, savingsRate: 17 },
      { month: "May 2026", income: 4500, expenses: 3400, savingsRate: 24 },
    ],
    recurringObligationsTotal: 900,
  });
  assertNoUndefined(result, "No undefined in output");
  assertNoNaN(result, "No NaN in output");
  assert(result.includes("improving"), "Correctly identifies improving trend");
  assert(!result.includes("declining"), "Does not falsely label declining trend");
}

section("generateFallbackMoneyStory — three months, declining trend");
{
  const result = generateFallbackMoneyStory("March 2026 — May 2026", {
    monthlyBreakdowns: [
      { month: "March 2026", income: 4000, expenses: 3000, savingsRate: 25 },
      { month: "April 2026", income: 4000, expenses: 3400, savingsRate: 15 },
      { month: "May 2026", income: 4000, expenses: 3700, savingsRate: 7 },
    ],
    recurringObligationsTotal: 900,
  });
  assertNoUndefined(result, "No undefined in output");
  assertNoNaN(result, "No NaN in output");
  assert(result.includes("declining"), "Correctly identifies declining trend");
  assert(!result.includes("improving"), "Does not falsely label improving trend");
}

section("generateFallbackMoneyStory — three months, steady trend");
{
  const result = generateFallbackMoneyStory("March 2026 — May 2026", {
    monthlyBreakdowns: [
      { month: "March 2026", income: 4000, expenses: 3200, savingsRate: 20 },
      { month: "April 2026", income: 4000, expenses: 3240, savingsRate: 19 },
      { month: "May 2026", income: 4000, expenses: 3200, savingsRate: 20 },
    ],
    recurringObligationsTotal: 900,
  });
  assertNoUndefined(result, "No undefined in output");
  assertNoNaN(result, "No NaN in output");
  assert(result.includes("steady"), "Correctly identifies steady trend");
}

// ─── generateFallbackRescueNarrative ─────────────────────────────────────────

section("generateFallbackRescueNarrative — low risk, zero savings (no transactions)");
{
  const result = generateFallbackRescueNarrative("low", [], { savingsRate: 0 });
  assertNoUndefined(result, "No undefined in output");
  assertNoNaN(result, "No NaN in output");
  assert(!result.includes("0% savings rate"), "Does not say 'great shape with 0% savings rate'");
  assert(result.length > 20, "Returns non-empty message");
}

section("generateFallbackRescueNarrative — low risk, healthy savings");
{
  const result = generateFallbackRescueNarrative(
    "low",
    [{ tag: "💰 Savings", title: "Automate a Savings Transfer" }],
    { savingsRate: 22 }
  );
  assertNoUndefined(result, "No undefined in output");
  assertNoNaN(result, "No NaN in output");
  assert(result.includes("22%"), "Includes actual savings rate");
}

section("generateFallbackRescueNarrative — medium risk, with actions");
{
  const result = generateFallbackRescueNarrative(
    "medium",
    [{ tag: "✂️ Cut Costs", title: "Audit Subscriptions" }],
    { savingsRate: 8 }
  );
  assertNoUndefined(result, "No undefined in output");
  assertNoNaN(result, "No NaN in output");
  assert(result.includes("Audit Subscriptions"), "Includes top action title");
}

section("generateFallbackRescueNarrative — high risk, no transactions");
{
  const result = generateFallbackRescueNarrative("high", [], { savingsRate: 0 });
  assertNoUndefined(result, "No undefined in output");
  assertNoNaN(result, "No NaN in output");
  assert(result.length > 20, "Returns non-empty message");
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
