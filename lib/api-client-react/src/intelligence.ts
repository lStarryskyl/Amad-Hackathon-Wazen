import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface RegretFactor {
  key: string;
  label: string;
  description: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
}

export interface RegretScore {
  id: number;
  score: number;
  level: "low" | "medium" | "high";
  factors: RegretFactor[];
  summary: string;
  safeZoneBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  spendingVelocityRatio: number;
  recurringBurdenPct: number;
  computedAt: string;
}

export interface RegretScoreHistoryItem {
  id: number;
  userId: string;
  score: number;
  level: string;
  factors: unknown;
  computedAt: string;
}

export interface RescueAction {
  id: string;
  priority: number;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: string;
  estimatedSaving?: number;
  tag: string;
}

export interface RescuePlan {
  id: number;
  riskLevel: string;
  actions: RescueAction[];
  narrative: string;
  aiUnavailable?: boolean;
  score: number;
  generatedAt: string;
}

export interface MoneyStory {
  id: number;
  periodLabel: string;
  narrative: string;
  aiUnavailable?: boolean;
  signals?: Record<string, unknown>;
  generatedAt: string;
}

// --- Regret Score ---

export const getRegretScoreUrl = () => `/api/ai/regret-score`;

export const getRegretScore = async (options?: RequestInit): Promise<RegretScore> =>
  customFetch<RegretScore>(getRegretScoreUrl(), { ...options, method: "GET" });

export const getRegretScoreQueryKey = () => [getRegretScoreUrl()] as const;

export const useGetRegretScore = <TData = RegretScore, TError = unknown>(
  options?: Omit<UseQueryOptions<RegretScore, TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({
    queryKey: getRegretScoreQueryKey(),
    queryFn: () => getRegretScore(),
    ...options,
  });

// --- Regret Score History ---

export const getRegretScoreHistoryUrl = () => `/api/ai/regret-score/history`;

export const getRegretScoreHistory = async (options?: RequestInit): Promise<RegretScoreHistoryItem[]> =>
  customFetch<RegretScoreHistoryItem[]>(getRegretScoreHistoryUrl(), { ...options, method: "GET" });

export const getRegretScoreHistoryQueryKey = () => [getRegretScoreHistoryUrl()] as const;

export const useGetRegretScoreHistory = <TData = RegretScoreHistoryItem[], TError = unknown>(
  options?: Omit<UseQueryOptions<RegretScoreHistoryItem[], TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({
    queryKey: getRegretScoreHistoryQueryKey(),
    queryFn: () => getRegretScoreHistory(),
    ...options,
  });

// --- Rescue Plan ---

export const generateRescuePlanUrl = () => `/api/ai/rescue-plan`;

export const generateRescuePlan = async (options?: RequestInit): Promise<RescuePlan> =>
  customFetch<RescuePlan>(generateRescuePlanUrl(), { ...options, method: "POST" });

export const useGenerateRescuePlan = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<RescuePlan, TError, void, TContext>
): UseMutationResult<RescuePlan, TError, void, TContext> =>
  useMutation({
    mutationFn: () => generateRescuePlan(),
    ...options,
  });

export const getLatestRescuePlanUrl = () => `/api/ai/rescue-plan/latest`;

export const getLatestRescuePlan = async (options?: RequestInit): Promise<RescuePlan> =>
  customFetch<RescuePlan>(getLatestRescuePlanUrl(), { ...options, method: "GET" });

export const getLatestRescuePlanQueryKey = () => [getLatestRescuePlanUrl()] as const;

export const useGetLatestRescuePlan = <TData = RescuePlan, TError = unknown>(
  options?: Omit<UseQueryOptions<RescuePlan, TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({
    queryKey: getLatestRescuePlanQueryKey(),
    queryFn: () => getLatestRescuePlan(),
    ...options,
  });

// --- Money Story ---

export const generateMoneyStoryUrl = () => `/api/ai/money-story`;

export const generateMoneyStory = async (options?: RequestInit): Promise<MoneyStory> =>
  customFetch<MoneyStory>(generateMoneyStoryUrl(), { ...options, method: "POST" });

export const useGenerateMoneyStory = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<MoneyStory, TError, void, TContext>
): UseMutationResult<MoneyStory, TError, void, TContext> =>
  useMutation({
    mutationFn: () => generateMoneyStory(),
    ...options,
  });

export const getLatestMoneyStoryUrl = () => `/api/ai/money-story/latest`;

export const getLatestMoneyStory = async (options?: RequestInit): Promise<MoneyStory> =>
  customFetch<MoneyStory>(getLatestMoneyStoryUrl(), { ...options, method: "GET" });

export const getLatestMoneyStoryQueryKey = () => [getLatestMoneyStoryUrl()] as const;

export const useGetLatestMoneyStory = <TData = MoneyStory, TError = unknown>(
  options?: Omit<UseQueryOptions<MoneyStory, TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({
    queryKey: getLatestMoneyStoryQueryKey(),
    queryFn: () => getLatestMoneyStory(),
    ...options,
  });
