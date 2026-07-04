import {
  checkCompareEligibility,
  hasEnoughChartData,
  computeCompareWinners,
} from "../utils/compare-flow";
import type { SimulationRun, SimulationResults } from "@workspace/api-client-react";

const makeDataPoints = (count = 3) =>
  Array.from({ length: count }, (_, i) => ({
    month: i + 1,
    label: `Month ${i + 1}`,
    balance: 10000 + i * 500,
    netCash: 500,
    cumulativeSaved: (i + 1) * 500,
    riskLevel: "low" as const,
  }));

const makeResults = (overrides: Partial<SimulationResults> = {}): SimulationResults => ({
  dataPoints: makeDataPoints(),
  goalTimelines: [],
  finalBalance: 12000,
  finalSavingsRate: 15,
  totalSaved: 2000,
  totalSpent: 28000,
  avgMonthlySavings: 500,
  breakEvenMonth: null,
  startingBalance: 10000,
  baseMonthlyIncome: 5000,
  baseMonthlyExpenses: 4500,
  projectedMonthlyIncome: 5000,
  projectedMonthlyExpenses: 4500,
  ...overrides,
});

const makeRun = (
  id: number,
  name: string,
  results: SimulationResults | null = makeResults()
): SimulationRun => ({
  id,
  scenarioName: name,
  inputs: {
    scenarioName: name,
    incomeChangePercent: 0,
    spendingChangePercent: 0,
    additionalMonthlySaving: 200,
    newMonthlyObligation: 0,
    oneTimeExpense: 0,
    timeHorizonMonths: 12,
  },
  results,
  narrative: null,
  createdAt: new Date().toISOString(),
});

describe("Compare flow — crash-prevention guards", () => {
  describe("checkCompareEligibility", () => {
    test("1a. Returns ineligible when run A has no results", () => {
      const runA = makeRun(1, "Save $200/mo", null);
      const runB = makeRun(2, "Cut Dining 20%");

      const result = checkCompareEligibility(runA, runB);

      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.missingName).toBe("Save $200/mo");
        expect(result.alertMessage).toContain("Save $200/mo");
        expect(result.alertMessage).toContain("no simulation results");
      }
    });

    test("1b. Returns ineligible when run B has no results", () => {
      const runA = makeRun(1, "Save $200/mo");
      const runB = makeRun(2, "Cut Dining 20%", null);

      const result = checkCompareEligibility(runA, runB);

      expect(result.eligible).toBe(false);
      if (!result.eligible) {
        expect(result.missingName).toBe("Cut Dining 20%");
        expect(result.alertMessage).toContain("Cut Dining 20%");
      }
    });

    test("1c. Returns eligible when both runs have results", () => {
      const runA = makeRun(1, "Save $200/mo");
      const runB = makeRun(2, "Cut Dining 20%");

      const result = checkCompareEligibility(runA, runB);

      expect(result.eligible).toBe(true);
    });
  });

  describe("hasEnoughChartData", () => {
    test("2a. Returns false when both results have empty dataPoints", () => {
      const resultsA = makeResults({ dataPoints: [] });
      const resultsB = makeResults({ dataPoints: [] });

      expect(hasEnoughChartData(resultsA, resultsB)).toBe(false);
    });

    test("2b. Returns false when one result has only one data point", () => {
      const resultsA = makeResults({ dataPoints: makeDataPoints(1) });
      const resultsB = makeResults({ dataPoints: makeDataPoints(3) });

      expect(hasEnoughChartData(resultsA, resultsB)).toBe(false);
    });

    test("2c. Returns true when both results have at least two data points", () => {
      const resultsA = makeResults({ dataPoints: makeDataPoints(3) });
      const resultsB = makeResults({ dataPoints: makeDataPoints(6) });

      expect(hasEnoughChartData(resultsA, resultsB)).toBe(true);
    });

    test("2d. Returns false when dataPoints is undefined (uses nullish coalescing)", () => {
      const resultsA = makeResults({ dataPoints: undefined as any });
      const resultsB = makeResults({ dataPoints: makeDataPoints(3) });

      expect(hasEnoughChartData(resultsA, resultsB)).toBe(false);
    });
  });

  describe("computeCompareWinners — normal compare flow", () => {
    test("3a. Identifies run A as winner when it has better balance change", () => {
      const runA = makeRun(1, "Save $200/mo", makeResults({
        startingBalance: 10000,
        finalBalance: 13000,
        finalSavingsRate: 20,
        totalSaved: 3000,
      }));
      const runB = makeRun(2, "Do Nothing", makeResults({
        startingBalance: 10000,
        finalBalance: 11000,
        finalSavingsRate: 5,
        totalSaved: 1000,
      }));

      const winners = computeCompareWinners(runA, runB);

      expect(winners.winnerBalance).toBe(true);
      expect(winners.winnerSavingsRate).toBe(true);
      expect(winners.winnerTotalSaved).toBe(true);
      expect(winners.winnerFinalBalance).toBe(true);
      expect(winners.aWins).toBe(4);
      expect(winners.bWins).toBe(0);
      expect(winners.overallWinnerIsA).toBe(true);
    });

    test("3b. Identifies run B as winner when it has better metrics", () => {
      const runA = makeRun(1, "Add Expense", makeResults({
        startingBalance: 10000,
        finalBalance: 9000,
        finalSavingsRate: 2,
        totalSaved: 200,
      }));
      const runB = makeRun(2, "Cut Spending", makeResults({
        startingBalance: 10000,
        finalBalance: 13500,
        finalSavingsRate: 25,
        totalSaved: 3500,
      }));

      const winners = computeCompareWinners(runA, runB);

      expect(winners.winnerBalance).toBe(false);
      expect(winners.winnerSavingsRate).toBe(false);
      expect(winners.winnerFinalBalance).toBe(false);
      expect(winners.bWins).toBeGreaterThan(winners.aWins);
      expect(winners.overallWinnerIsA).toBe(false);
    });

    test("3c. Returns null for overall winner when runs tie", () => {
      const sameResults = makeResults({
        startingBalance: 10000,
        finalBalance: 12000,
        finalSavingsRate: 15,
        totalSaved: 2000,
      });
      const runA = makeRun(1, "Plan A", sameResults);
      const runB = makeRun(2, "Plan B", { ...sameResults });

      const winners = computeCompareWinners(runA, runB);

      expect(winners.aWins).toBe(0);
      expect(winners.bWins).toBe(0);
      expect(winners.overallWinnerIsA).toBe(null);
    });
  });
});
