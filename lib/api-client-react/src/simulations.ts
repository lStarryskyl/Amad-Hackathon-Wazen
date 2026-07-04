import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface ScenarioInputs {
  scenarioName: string;
  incomeChangePercent: number;
  spendingChangePercent: number;
  additionalMonthlySaving: number;
  newMonthlyObligation: number;
  oneTimeExpense: number;
  timeHorizonMonths: number;
}

export interface MonthDataPoint {
  month: number;
  label: string;
  balance: number;
  netCash: number;
  cumulativeSaved: number;
  riskLevel: "low" | "medium" | "high";
}

export interface GoalTimeline {
  goalId: number;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  monthsToComplete: number | null;
  completionLabel: string | null;
}

export interface SimulationResults {
  dataPoints: MonthDataPoint[];
  goalTimelines: GoalTimeline[];
  finalBalance: number;
  finalSavingsRate: number;
  totalSaved: number;
  totalSpent: number;
  avgMonthlySavings: number;
  breakEvenMonth: number | null;
  startingBalance: number;
  baseMonthlyIncome: number;
  baseMonthlyExpenses: number;
  projectedMonthlyIncome: number;
  projectedMonthlyExpenses: number;
}

export interface SimulationRun {
  id: number;
  scenarioName: string;
  inputs: ScenarioInputs;
  results: SimulationResults | null;
  narrative: string | null;
  createdAt: string;
}

// --- Run Simulation ---

export const runSimulationUrl = () => `/api/simulations`;

export const runSimulation = async (body: ScenarioInputs, options?: RequestInit): Promise<SimulationRun> =>
  customFetch<SimulationRun>(runSimulationUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    body: JSON.stringify(body),
  });

export const useRunSimulation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<SimulationRun, TError, ScenarioInputs, TContext>
): UseMutationResult<SimulationRun, TError, ScenarioInputs, TContext> =>
  useMutation({
    mutationFn: (inputs: ScenarioInputs) => runSimulation(inputs),
    ...options,
  });

// --- List Simulations ---

export const getSimulationsUrl = () => `/api/simulations`;

export const getSimulations = async (options?: RequestInit): Promise<SimulationRun[]> =>
  customFetch<SimulationRun[]>(getSimulationsUrl(), { ...options, method: "GET" });

export const getSimulationsQueryKey = () => [getSimulationsUrl()] as const;

export const useGetSimulations = <TData = SimulationRun[], TError = unknown>(
  options?: Omit<UseQueryOptions<SimulationRun[], TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({
    queryKey: getSimulationsQueryKey(),
    queryFn: () => getSimulations(),
    ...options,
  });

// --- Get Single Simulation ---

export const getSimulationUrl = (id: number) => `/api/simulations/${id}`;

export const getSimulation = async (id: number, options?: RequestInit): Promise<SimulationRun> =>
  customFetch<SimulationRun>(getSimulationUrl(id), { ...options, method: "GET" });

export const getSimulationQueryKey = (id: number) => [getSimulationUrl(id)] as const;

export const useGetSimulation = <TData = SimulationRun, TError = unknown>(
  id: number,
  options?: Omit<UseQueryOptions<SimulationRun, TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({
    queryKey: getSimulationQueryKey(id),
    queryFn: () => getSimulation(id),
    ...options,
  });

// --- Delete Simulation ---

export const deleteSimulationUrl = (id: number) => `/api/simulations/${id}`;

export const deleteSimulation = async (id: number, options?: RequestInit): Promise<void> =>
  customFetch<void>(deleteSimulationUrl(id), { ...options, method: "DELETE" });

export const useDeleteSimulation = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<void, TError, number, TContext>
): UseMutationResult<void, TError, number, TContext> =>
  useMutation({
    mutationFn: (id: number) => deleteSimulation(id),
    ...options,
  });
