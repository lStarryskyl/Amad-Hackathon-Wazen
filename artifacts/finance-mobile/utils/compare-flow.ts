import type { SimulationRun, SimulationResults } from "@workspace/api-client-react";

export type CompareEligibilityResult =
  | { eligible: false; missingName: string; alertMessage: string }
  | { eligible: true };

export function checkCompareEligibility(
  runA: SimulationRun,
  runB: SimulationRun
): CompareEligibilityResult {
  if (!runA.results || !runB.results) {
    const missingName = !runA.results ? runA.scenarioName : runB.scenarioName;
    return {
      eligible: false,
      missingName,
      alertMessage: `"${missingName}" has no simulation results yet and can't be compared. Please select a different scenario.`,
    };
  }
  return { eligible: true };
}

export function hasEnoughChartData(
  resultsA: SimulationResults,
  resultsB: SimulationResults
): boolean {
  const dpA = resultsA.dataPoints ?? [];
  const dpB = resultsB.dataPoints ?? [];
  return dpA.length >= 2 && dpB.length >= 2;
}

export interface CompareWinners {
  winnerBalance: boolean | null;
  winnerSavingsRate: boolean | null;
  winnerTotalSaved: boolean | null;
  winnerFinalBalance: boolean | null;
  aWins: number;
  bWins: number;
  overallWinnerIsA: boolean | null;
}

export function computeCompareWinners(
  runA: SimulationRun,
  runB: SimulationRun
): CompareWinners {
  const resA = runA.results!;
  const resB = runB.results!;

  const balA = resA.finalBalance - resA.startingBalance;
  const balB = resB.finalBalance - resB.startingBalance;

  const winnerBalance: boolean | null =
    balA === balB ? null : balA > balB;
  const winnerSavingsRate: boolean | null =
    resA.finalSavingsRate === resB.finalSavingsRate
      ? null
      : resA.finalSavingsRate > resB.finalSavingsRate;
  const winnerTotalSaved: boolean | null =
    resA.totalSaved === resB.totalSaved ? null : resA.totalSaved > resB.totalSaved;
  const winnerFinalBalance: boolean | null =
    resA.finalBalance === resB.finalBalance ? null : resA.finalBalance > resB.finalBalance;

  const winners = [winnerBalance, winnerSavingsRate, winnerTotalSaved, winnerFinalBalance];
  const aWins = winners.filter((w) => w === true).length;
  const bWins = winners.filter((w) => w === false).length;
  const overallWinnerIsA =
    aWins > bWins ? true : bWins > aWins ? false : null;

  return {
    winnerBalance,
    winnerSavingsRate,
    winnerTotalSaved,
    winnerFinalBalance,
    aWins,
    bWins,
    overallWinnerIsA,
  };
}
