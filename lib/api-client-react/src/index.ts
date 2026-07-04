// Explicitly re-export intelligence.ts symbols first to resolve name conflicts with generated API.
// intelligence.ts has richer types (RegretScore.summary, RescueAction.impact, etc.) the mobile
// app depends on, so these explicit re-exports win over the wildcard exports below.
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
export * from "./generated/api";
export * from "./generated/api.schemas";
export * from "./simulations";
export * from "./engagement";
export { setBaseUrl, setAuthTokenGetter, customFetch } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
