// Explicit named re-exports for manually-written modules must come BEFORE
// `export * from "./generated/api"` so they win over any conflicting names
// in the generated client. TypeScript silently drops ambiguous wildcard
// exports, so anything that clashes with the generated API must be listed
// explicitly here.

// ─── intelligence.ts ─────────────────────────────────────────────────────────
export type {
  RegretFactor,
  RegretScore,
  RegretScoreHistoryItem,
  RescueAction,
  RescuePlan,
  MoneyStory,
  TransactionCount,
} from "./intelligence";
export {
  getRegretScoreUrl,
  getRegretScore,
  getRegretScoreQueryKey,
  useGetRegretScore,
  getRegretScoreHistoryUrl,
  getRegretScoreHistory,
  getRegretScoreHistoryQueryKey,
  useGetRegretScoreHistory,
  generateRescuePlanUrl,
  generateRescuePlan,
  useGenerateRescuePlan,
  getLatestRescuePlanUrl,
  getLatestRescuePlan,
  getLatestRescuePlanQueryKey,
  useGetLatestRescuePlan,
  generateMoneyStoryUrl,
  generateMoneyStory,
  useGenerateMoneyStory,
  getLatestMoneyStoryUrl,
  getLatestMoneyStory,
  getLatestMoneyStoryQueryKey,
  useGetLatestMoneyStory,
  getTransactionCountUrl,
  getTransactionCount,
  getTransactionCountQueryKey,
  useGetTransactionCount,
} from "./intelligence";

// ─── simulations.ts ──────────────────────────────────────────────────────────
export type {
  ScenarioInputs,
  MonthDataPoint,
  GoalTimeline,
  SimulationResults,
  SimulationRun,
  UpdateSimulationBody,
} from "./simulations";
export {
  runSimulationUrl,
  runSimulation,
  useRunSimulation,
  getSimulationsUrl,
  getSimulations,
  getSimulationsQueryKey,
  useGetSimulations,
  getSimulationUrl,
  getSimulation,
  getSimulationQueryKey,
  useGetSimulation,
  updateSimulationUrl,
  updateSimulation,
  useUpdateSimulation,
  deleteSimulationUrl,
  deleteSimulation,
  useDeleteSimulation,
} from "./simulations";

// ─── engagement.ts ───────────────────────────────────────────────────────────
export type {
  BehavioralPattern,
  PatternsResult,
  Guardrail,
  GuardrailStanding,
  GuardrailStandingResult,
  CreateGuardrailRequest,
  Streak,
  Achievement,
  AchievementsResult,
  DailyCheckin,
  TodayCheckinResult,
  CheckinResult,
  AppAlert,
  AlertsResult,
} from "./engagement";
export {
  getPatternsUrl,
  getPatterns,
  getPatternsQueryKey,
  useGetPatterns,
  getGuardrailsUrl,
  getGuardrails,
  getGuardrailsQueryKey,
  useGetGuardrails,
  createGuardrail,
  useCreateGuardrail,
  deleteGuardrail,
  useDeleteGuardrail,
  getGuardrailStandingUrl,
  getGuardrailStanding,
  getGuardrailStandingQueryKey,
  useGetGuardrailStanding,
  checkGuardrailAlerts,
  useCheckGuardrailAlerts,
  getStreaksUrl,
  getStreaks,
  getStreaksQueryKey,
  useGetStreaks,
  getAchievementsUrl,
  getAchievements,
  getAchievementsQueryKey,
  useGetAchievements,
  getTodayCheckinUrl,
  getTodayCheckin,
  getTodayCheckinQueryKey,
  useGetTodayCheckin,
  submitCheckin,
  useSubmitCheckin,
  getAlertsUrl,
  getAlerts,
  getAlertsQueryKey,
  useGetAlerts,
  markAlertRead,
  useMarkAlertRead,
  markAllAlertsRead,
  useMarkAllAlertsRead,
  registerPushToken,
} from "./engagement";

// ─── Generated API (must come last so explicit exports above win) ─────────────
export * from "./generated/api";
export * from "./generated/api.schemas";

// ─── custom-fetch ─────────────────────────────────────────────────────────────
export { setBaseUrl, setAuthTokenGetter, customFetch } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
