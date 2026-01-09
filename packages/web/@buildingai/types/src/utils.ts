import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";

import type { PaginatedResponse } from "./base";

/**
 * Utility type for useQuery options, omitting queryKey and queryFn
 */
export type QueryOptionsUtil<TData> = Omit<UseQueryOptions<TData>, "queryKey" | "queryFn">;

/**
 * Utility type for useMutation options, omitting mutationFn
 */
export type MutationOptionsUtil<TData, TVariables = void, TError = Error> = Omit<
    UseMutationOptions<TData, TError, TVariables>,
    "mutationFn"
>;

/**
 * Utility type for useQuery options, omitting queryKey and queryFn
 */
export type PaginatedQueryOptionsUtil<TData> = Omit<
    UseQueryOptions<PaginatedResponse<TData>>,
    "queryKey" | "queryFn"
>;
