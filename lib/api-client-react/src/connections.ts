import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface ConnectedAccount {
  id: number;
  accountName: string;
  accountType: string;
  balance: string;
  currency: string;
  createdAt: string | null;
}

export interface BankConnection {
  institutionName: string;
  accounts: ConnectedAccount[];
  connectedAt: string | null;
}

export interface ConnectionsResult {
  connections: BankConnection[];
}

export interface DisconnectResult {
  disconnected: boolean;
  institutionName: string;
  accountsDisconnected: number;
}

// --- List connections ---

export const getConnectionsUrl = () => `/api/connections`;

export const getConnections = async (options?: RequestInit): Promise<ConnectionsResult> =>
  customFetch<ConnectionsResult>(getConnectionsUrl(), { ...options, method: "GET" });

export const getConnectionsQueryKey = () => [getConnectionsUrl()] as const;

export const useGetConnections = <TData = ConnectionsResult, TError = unknown>(
  options?: Omit<UseQueryOptions<ConnectionsResult, TError, TData>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> =>
  useQuery({
    queryKey: getConnectionsQueryKey(),
    queryFn: () => getConnections(),
    ...options,
  });

// --- Disconnect a bank ---

export const disconnectBankUrl = (institutionName: string) =>
  `/api/connections/${encodeURIComponent(institutionName)}`;

export const disconnectBank = async (
  institutionName: string,
  options?: RequestInit
): Promise<DisconnectResult> =>
  customFetch<DisconnectResult>(disconnectBankUrl(institutionName), {
    ...options,
    method: "DELETE",
  });

export const useDisconnectBank = <TError = unknown, TContext = unknown>(
  options?: UseMutationOptions<DisconnectResult, TError, string, TContext>
): UseMutationResult<DisconnectResult, TError, string, TContext> =>
  useMutation({
    mutationFn: (institutionName: string) => disconnectBank(institutionName),
    ...options,
  });
