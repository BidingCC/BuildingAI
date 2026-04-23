import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type TaskAwardItem = {
    type: string;
    name: string;
    desc: string;
    award: number;
    isGet: boolean;
};

export function useTaskAwardCenterQuery(
    options?: QueryOptionsUtil<TaskAwardItem[]>,
): UseQueryResult<TaskAwardItem[], Error> {
    return useQuery<TaskAwardItem[]>({
        queryKey: ["task-award", "center"],
        queryFn: () => apiHttpClient.get<TaskAwardItem[]>("/task-award/center"),
        ...options,
    });
}

export function useTaskAwardSignMutation(
    options?: MutationOptionsUtil<unknown, void>,
): UseMutationResult<unknown, Error, void, unknown> {
    const queryClient = useQueryClient();
    return useMutation<unknown, Error, void>({
        mutationFn: () => apiHttpClient.post<unknown>("/task-award/sign"),
        onSuccess: async (...args) => {
            await queryClient.invalidateQueries({ queryKey: ["task-award", "center"] });
            options?.onSuccess?.(...args);
        },
        ...options,
    });
}
