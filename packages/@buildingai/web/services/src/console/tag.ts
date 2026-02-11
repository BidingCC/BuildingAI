import type { TagTypeType } from "@buildingai/constants";
import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type ConsoleTag = {
    id: string;
    name: string;
    type: string;
    bindingCount?: number;
};

export type ListConsoleTagsParams = {
    type?: string;
    name?: string;
};

export type CreateConsoleTagParams = {
    name: string;
    type?: TagTypeType;
};

export type UpdateConsoleTagParams = {
    name?: string;
    type?: TagTypeType;
};

export async function listConsoleTags(params?: ListConsoleTagsParams): Promise<ConsoleTag[]> {
    const search = new URLSearchParams();
    if (params?.type) search.set("type", params.type);
    if (params?.name) search.set("name", params.name);
    const qs = search.toString();
    return consoleHttpClient.get<ConsoleTag[]>(qs ? `/tag?${qs}` : "/tag");
}

export async function createConsoleTag(params: CreateConsoleTagParams): Promise<ConsoleTag> {
    return consoleHttpClient.post<ConsoleTag>("/tag", params);
}

export async function updateConsoleTag(
    id: string,
    params: UpdateConsoleTagParams,
): Promise<ConsoleTag> {
    return consoleHttpClient.put<ConsoleTag>(`/tag/${id}`, params);
}

export async function deleteConsoleTag(id: string): Promise<{ success: boolean }> {
    return consoleHttpClient.delete<{ success: boolean }>(`/tag/${id}`);
}

export function useConsoleTagsQuery(type: TagTypeType, options?: QueryOptionsUtil<ConsoleTag[]>) {
    return useQuery({
        queryKey: ["console", "tags", type],
        queryFn: () => listConsoleTags({ type }),
        ...options,
    });
}

export function useConsoleDatasetTagsQuery(options?: QueryOptionsUtil<ConsoleTag[]>) {
    return useQuery({
        queryKey: ["console", "tags", "dataset"],
        queryFn: () => listConsoleTags({ type: "dataset" }),
        ...options,
    });
}

export function useCreateConsoleTagMutation(
    type: TagTypeType,
    options?: MutationOptionsUtil<ConsoleTag, CreateConsoleTagParams>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params) => createConsoleTag({ ...params, type: params.type ?? type }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["console", "tags"] });
        },
        ...options,
    });
}

export function useUpdateConsoleTagMutation(
    options?: MutationOptionsUtil<ConsoleTag, { id: string } & UpdateConsoleTagParams>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...params }) => updateConsoleTag(id, params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["console", "tags"] });
        },
        ...options,
    });
}

export function useDeleteConsoleTagMutation(
    options?: MutationOptionsUtil<{ success: boolean }, string>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteConsoleTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["console", "tags"] });
        },
        ...options,
    });
}
