import type { AgentDashboardResult } from "@buildingai/types";
import type {
    MutationOptionsUtil,
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
} from "@buildingai/web-types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type ConsoleAgentStatus =
    | "all"
    | "none"
    | "pending"
    | "approved"
    | "rejected"
    | "published"
    | "unpublished";

export type ConsoleAgentItemTag = { id: string; name: string };

export type ConsoleAgentQuickCommand = {
    avatar: string;
    name: string;
    content: string;
    replyType: "custom" | "model";
    replyContent: string;
};

export type ConsoleAgentItem = {
    id: string;
    name: string;
    modelName?: string | null;
    modelProvider?: string | null;
    iconUrl?: string | null;
    description?: string | null;
    avatar?: string | null;
    rolePrompt?: string | null;
    openingStatement?: string | null;
    openingQuestions?: string[];
    quickCommands?: ConsoleAgentQuickCommand[];
    creatorName: string;
    publishedToSquare: boolean;
    squarePublishStatus: ConsoleAgentStatus;
    squareRejectReason?: string | null;
    updatedAt: string;
    publishedAt?: string | null;
    userCount: number;
    tags?: ConsoleAgentItemTag[];
    createMode: string;
};

export type QueryConsoleAgentsDto = {
    page?: number;
    pageSize?: number;
    name?: string;
    status?: ConsoleAgentStatus;
    tagId?: string;
};

export async function getConsoleAgentDashboard(
    agentId: string,
    params?: { startTime?: string; endTime?: string },
): Promise<AgentDashboardResult> {
    const search = new URLSearchParams();
    if (params?.startTime) search.set("startTime", params.startTime);
    if (params?.endTime) search.set("endTime", params.endTime);
    const qs = search.toString();
    return consoleHttpClient.get<AgentDashboardResult>(
        qs ? `/agents/${agentId}/dashboard?${qs}` : `/agents/${agentId}/dashboard`,
    );
}

export function useConsoleAgentDashboardQuery(
    agentId: string | undefined,
    params?: { startTime?: string; endTime?: string },
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: ["console", "agents", "dashboard", agentId ?? "", params],
        queryFn: () => getConsoleAgentDashboard(agentId!, params),
        enabled: !!agentId && options?.enabled !== false,
    });
}

export function useConsoleAgentsListQuery(
    params?: QueryConsoleAgentsDto,
    options?: PaginatedQueryOptionsUtil<ConsoleAgentItem>,
) {
    return useQuery({
        queryKey: ["console", "agents", "list", params],
        queryFn: () =>
            consoleHttpClient.get<PaginatedResponse<ConsoleAgentItem>>("/agents", {
                params,
            }),
        ...options,
    });
}

export function useApproveAgentSquareMutation(
    options?: MutationOptionsUtil<ConsoleAgentItem, string>,
) {
    return useMutation<ConsoleAgentItem, Error, string>({
        mutationFn: (id) =>
            consoleHttpClient.post<ConsoleAgentItem>(`/agents/${id}/approve-square`),
        ...options,
    });
}

export function useRejectAgentSquareMutation(
    options?: MutationOptionsUtil<ConsoleAgentItem, { id: string; reason?: string }>,
) {
    return useMutation<ConsoleAgentItem, Error, { id: string; reason?: string }>({
        mutationFn: ({ id, reason }) =>
            consoleHttpClient.post<ConsoleAgentItem>(`/agents/${id}/reject-square`, {
                reason,
            }),
        ...options,
    });
}

export function usePublishAgentSquareMutation(
    options?: MutationOptionsUtil<ConsoleAgentItem, string>,
) {
    return useMutation<ConsoleAgentItem, Error, string>({
        mutationFn: (id) =>
            consoleHttpClient.post<ConsoleAgentItem>(`/agents/${id}/publish-square`),
        ...options,
    });
}

export function useUnpublishAgentSquareMutation(
    options?: MutationOptionsUtil<ConsoleAgentItem, string>,
) {
    return useMutation<ConsoleAgentItem, Error, string>({
        mutationFn: (id) =>
            consoleHttpClient.post<ConsoleAgentItem>(`/agents/${id}/unpublish-square`),
        ...options,
    });
}

export function useDeleteAgentMutation(options?: MutationOptionsUtil<void, string>) {
    return useMutation<void, Error, string>({
        mutationFn: (id) => consoleHttpClient.delete<void>(`/agents/${id}`),
        ...options,
    });
}
