import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BehavioralPattern {
  key: string;
  title: string;
  description: string;
  icon: string;
  severity: "info" | "warning" | "positive";
  dataPoint?: string;
}

export interface PatternsResult {
  patterns: BehavioralPattern[];
  detectedAt: string;
}

export interface Guardrail {
  id: number;
  userId: string;
  categoryName: string;
  period: string;
  limitAmount: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuardrailStanding {
  guardrail: Guardrail;
  spent: number;
  limit: number;
  spentPercent: number;
  status: "safe" | "warning" | "breached";
  remaining: number;
}

export interface GuardrailStandingResult {
  standing: GuardrailStanding[];
  evaluatedAt: string;
}

export interface CreateGuardrailRequest {
  categoryName: string;
  period?: string;
  limitAmount: number;
  color?: string;
}

export interface Streak {
  id: number;
  userId: string;
  type: string;
  currentCount: number;
  longestCount: number;
  lastDate: string | null;
  updatedAt: string;
}

export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface AchievementsResult {
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
}

export interface DailyCheckin {
  id: number;
  userId: string;
  checkinDate: string;
  healthScore: number;
  summary: string;
  moodEmoji: string;
  createdAt: string;
}

export interface TodayCheckinResult {
  checkin: DailyCheckin | null;
  today: string;
}

export interface CheckinResult {
  checkin: DailyCheckin;
  streak: Streak;
  newAchievements: Achievement[];
  alreadyDone?: boolean;
}

export interface AppAlert {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  category: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
}

export interface AlertsResult {
  alerts: AppAlert[];
  unreadCount: number;
}

// ─── Patterns ─────────────────────────────────────────────────────────────────

export const getPatternsUrl = () => `/api/ai/patterns`;
export const getPatterns = async (): Promise<PatternsResult> =>
  customFetch<PatternsResult>(getPatternsUrl(), { method: "GET" });
export const getPatternsQueryKey = () => [getPatternsUrl()] as const;

export const useGetPatterns = <TData = PatternsResult, TError = unknown>(
  options?: Omit<UseQueryOptions<PatternsResult, TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({ queryKey: getPatternsQueryKey(), queryFn: () => getPatterns(), ...options });

// ─── Guardrails ───────────────────────────────────────────────────────────────

export const getGuardrailsUrl = () => `/api/guardrails`;
export const getGuardrails = async (): Promise<Guardrail[]> =>
  customFetch<Guardrail[]>(getGuardrailsUrl(), { method: "GET" });
export const getGuardrailsQueryKey = () => [getGuardrailsUrl()] as const;

export const useGetGuardrails = <TData = Guardrail[], TError = unknown>(
  options?: Omit<UseQueryOptions<Guardrail[], TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({ queryKey: getGuardrailsQueryKey(), queryFn: () => getGuardrails(), ...options });

export const createGuardrail = async (data: CreateGuardrailRequest): Promise<Guardrail> =>
  customFetch<Guardrail>(getGuardrailsUrl(), { method: "POST", body: JSON.stringify(data) });

export const useCreateGuardrail = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<Guardrail, TError, CreateGuardrailRequest, TContext>
): UseMutationResult<Guardrail, TError, CreateGuardrailRequest, TContext> =>
  useMutation({ mutationFn: (data) => createGuardrail(data), ...options });

export const deleteGuardrail = async (id: number): Promise<void> =>
  customFetch<void>(`/api/guardrails/${id}`, { method: "DELETE" });

export const useDeleteGuardrail = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<void, TError, number, TContext>
): UseMutationResult<void, TError, number, TContext> =>
  useMutation({ mutationFn: (id) => deleteGuardrail(id), ...options });

export const getGuardrailStandingUrl = () => `/api/guardrails/standing`;
export const getGuardrailStanding = async (): Promise<GuardrailStandingResult> =>
  customFetch<GuardrailStandingResult>(getGuardrailStandingUrl(), { method: "GET" });
export const getGuardrailStandingQueryKey = () => [getGuardrailStandingUrl()] as const;

export const useGetGuardrailStanding = <TData = GuardrailStandingResult, TError = unknown>(
  options?: Omit<UseQueryOptions<GuardrailStandingResult, TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({ queryKey: getGuardrailStandingQueryKey(), queryFn: () => getGuardrailStanding(), ...options });

export const checkGuardrailAlerts = async (): Promise<{ alertsGenerated: number }> =>
  customFetch<{ alertsGenerated: number }>("/api/guardrails/check-alerts", { method: "POST" });

export const useCheckGuardrailAlerts = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<{ alertsGenerated: number }, TError, void, TContext>
): UseMutationResult<{ alertsGenerated: number }, TError, void, TContext> =>
  useMutation({ mutationFn: () => checkGuardrailAlerts(), ...options });

// ─── Streaks ──────────────────────────────────────────────────────────────────

export const getStreaksUrl = () => `/api/streaks`;
export const getStreaks = async (): Promise<Streak[]> =>
  customFetch<Streak[]>(getStreaksUrl(), { method: "GET" });
export const getStreaksQueryKey = () => [getStreaksUrl()] as const;

export const useGetStreaks = <TData = Streak[], TError = unknown>(
  options?: Omit<UseQueryOptions<Streak[], TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({ queryKey: getStreaksQueryKey(), queryFn: () => getStreaks(), ...options });

// ─── Achievements ─────────────────────────────────────────────────────────────

export const getAchievementsUrl = () => `/api/achievements`;
export const getAchievements = async (): Promise<AchievementsResult> =>
  customFetch<AchievementsResult>(getAchievementsUrl(), { method: "GET" });
export const getAchievementsQueryKey = () => [getAchievementsUrl()] as const;

export const useGetAchievements = <TData = AchievementsResult, TError = unknown>(
  options?: Omit<UseQueryOptions<AchievementsResult, TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({ queryKey: getAchievementsQueryKey(), queryFn: () => getAchievements(), ...options });

// ─── Daily Check-in ───────────────────────────────────────────────────────────

export const getTodayCheckinUrl = () => `/api/checkin/today`;
export const getTodayCheckin = async (): Promise<TodayCheckinResult> =>
  customFetch<TodayCheckinResult>(getTodayCheckinUrl(), { method: "GET" });
export const getTodayCheckinQueryKey = () => [getTodayCheckinUrl()] as const;

export const useGetTodayCheckin = <TData = TodayCheckinResult, TError = unknown>(
  options?: Omit<UseQueryOptions<TodayCheckinResult, TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({ queryKey: getTodayCheckinQueryKey(), queryFn: () => getTodayCheckin(), ...options });

export const submitCheckin = async (): Promise<CheckinResult> =>
  customFetch<CheckinResult>("/api/checkin", { method: "POST" });

export const useSubmitCheckin = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<CheckinResult, TError, void, TContext>
): UseMutationResult<CheckinResult, TError, void, TContext> =>
  useMutation({ mutationFn: () => submitCheckin(), ...options });

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const getAlertsUrl = () => `/api/alerts`;
export const getAlerts = async (): Promise<AlertsResult> =>
  customFetch<AlertsResult>(getAlertsUrl(), { method: "GET" });
export const getAlertsQueryKey = () => [getAlertsUrl()] as const;

export const useGetAlerts = <TData = AlertsResult, TError = unknown>(
  options?: Omit<UseQueryOptions<AlertsResult, TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({ queryKey: getAlertsQueryKey(), queryFn: () => getAlerts(), ...options });

export const markAlertRead = async (id: number): Promise<{ ok: boolean }> =>
  customFetch<{ ok: boolean }>(`/api/alerts/${id}/read`, { method: "PATCH" });

export const useMarkAlertRead = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<{ ok: boolean }, TError, number, TContext>
): UseMutationResult<{ ok: boolean }, TError, number, TContext> =>
  useMutation({ mutationFn: (id) => markAlertRead(id), ...options });

export const markAllAlertsRead = async (): Promise<{ ok: boolean }> =>
  customFetch<{ ok: boolean }>("/api/alerts/read-all", { method: "POST" });

export const useMarkAllAlertsRead = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<{ ok: boolean }, TError, void, TContext>
): UseMutationResult<{ ok: boolean }, TError, void, TContext> =>
  useMutation({ mutationFn: () => markAllAlertsRead(), ...options });
