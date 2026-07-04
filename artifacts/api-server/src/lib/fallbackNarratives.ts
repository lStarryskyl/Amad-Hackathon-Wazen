export function generateFallbackRescueNarrative(
  riskLevel: string,
  actions: Array<{ title: string; tag: string }>,
  context: { savingsRate: number }
): string {
  const hasData = context.savingsRate > 0;
  if (riskLevel === "low") {
    if (!hasData) {
      return `You're off to a clean start — no red flags detected yet. Add your transactions and recurring bills to get a personalised view of where your money is going.`;
    }
    return `Your finances are in great shape with a ${context.savingsRate}% savings rate. Keep your current habits going — consistency is the real superpower in personal finance.`;
  }
  if (riskLevel === "medium") {
    const top = actions[0];
    return `Things are manageable, but there's room to strengthen your position. Your most impactful move right now is: ${top?.tag} ${top?.title}. Small adjustments today create big protection tomorrow.`;
  }
  return `Your spending signals need attention, but you're already ahead by seeing this clearly. Start with the highest-priority action and tackle one thing at a time — financial recovery is a series of small, consistent wins.`;
}

export function generateFallbackMoneyStory(periodLabel: string, signals: Record<string, unknown>): string {
  const breakdowns = signals.monthlyBreakdowns as Array<{ month: string; income: number; expenses: number; savingsRate: number }> | undefined;

  if (!breakdowns || breakdowns.length === 0) {
    return `You're just getting started — no transaction history recorded yet for ${periodLabel}. Once you add your first transactions, your financial story will begin to take shape here.`;
  }

  const allZeroIncome = breakdowns.every((m) => m.income === 0);
  if (allZeroIncome) {
    return `No income or spending activity has been recorded for ${periodLabel} yet. Start adding your transactions to unlock a personalised view of your financial patterns and progress.`;
  }

  const avgSavings = breakdowns.reduce((s, m) => s + m.savingsRate, 0) / breakdowns.length;

  if (breakdowns.length === 1) {
    const m = breakdowns[0];
    const savingsNote =
      m.savingsRate >= 20
        ? `a healthy ${m.savingsRate}% savings rate`
        : m.savingsRate > 0
        ? `a ${m.savingsRate}% savings rate — there's room to grow`
        : `spending matching income this month`;
    return `So far in ${m.month} your story shows ${savingsNote}. With $${signals.recurringObligationsTotal} in monthly fixed commitments, you're building the foundation of your financial picture. Add more months of data to see how your patterns evolve over time.`;
  }

  const oldest = breakdowns[0];
  const newest = breakdowns[breakdowns.length - 1];
  const trend =
    newest.savingsRate > oldest.savingsRate + 2
      ? "improving"
      : newest.savingsRate < oldest.savingsRate - 2
      ? "declining"
      : "steady";

  const trendNote =
    trend === "improving"
      ? "Your savings discipline has been building — a positive sign for the months ahead."
      : trend === "declining"
      ? "Your savings rate has dipped recently — worth reviewing where the extra spending is going."
      : "Your financial pace has stayed consistent — a solid baseline to build from.";

  return `Over ${periodLabel}, your financial story has been one of ${trend} discipline. With an average savings rate of ${avgSavings.toFixed(0)}%, you've balanced $${signals.recurringObligationsTotal} in monthly fixed commitments while navigating everyday spending. ${trendNote} Each additional month of data brings more clarity about where your financial energy goes — keep building on this foundation.`;
}
