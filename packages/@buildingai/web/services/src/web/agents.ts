import { useAuthStore } from "@buildingai/stores";
import type {
    Agent,
    AgentDashboardResult,
    CreateAgentParams,
    ListAgentsResult,
    ListSquareAgentsParams,
    PublishedAgentDetail,
    SpeechOptions,
    TranscribeResult,
    UpdateAgentConfigParams,
} from "@buildingai/types";
import type { InfiniteData } from "@tanstack/react-query";
import type { UseInfiniteQueryResult, UseMutationResult } from "@tanstack/react-query";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";
import { listTags, type Tag } from "./tag";

export type {
    Agent,
    AgentCore,
    AgentDashboardResult,
    CreateAgentParams,
    DailyFeedbackItem,
    DashboardChartItem,
    ListAgentsResult,
    ListSquareAgentsParams,
    PublishedAgentDetail,
    SpeechOptions,
    TranscribeResult,
    UpdateAgentConfigParams,
} from "@buildingai/types";

export async function transcribeAgentAudio(
    agentId: string,
    audioBlob: Blob,
): Promise<TranscribeResult> {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    const body = await apiHttpClient.upload<TranscribeResult>(
        `/ai-agents/${agentId}/voice/transcribe`,
        formData,
    );
    return (body as { data?: TranscribeResult })?.data ?? (body as TranscribeResult);
}

export async function speakAgentText(
    agentId: string,
    text: string,
    options?: SpeechOptions,
): Promise<Blob> {
    const pathPrefix =
        (typeof import.meta !== "undefined" &&
            (import.meta as { env?: Record<string, string> }).env?.VITE_APP_WEB_API_PREFIX) ||
        "/api";
    const path = `${pathPrefix.replace(/\/+$/, "")}/ai-agents/${agentId}/voice/speech`;
    const res = await apiHttpClient.instance.post<Blob>(
        path,
        {
            text,
            modelId: options?.modelId,
            voice: options?.voice,
            speed: options?.speed,
            responseFormat: options?.responseFormat ?? "mp3",
        },
        {
            responseType: "blob",
            headers: { "Content-Type": "application/json" },
        },
    );
    return res.data;
}

export async function createAgent(params: CreateAgentParams): Promise<Agent> {
    return apiHttpClient.post<Agent>("/ai-agents", params);
}

export async function updateAgentConfig(
    agentId: string,
    params: UpdateAgentConfigParams,
): Promise<Agent> {
    return apiHttpClient.patch<Agent>(`/ai-agents/${agentId}`, params);
}

export async function getAgent(agentId: string): Promise<Agent> {
    return apiHttpClient.get<Agent>(`/ai-agents/${agentId}`);
}

export async function getPublishedAgentDetail(agentId: string): Promise<PublishedAgentDetail> {
    return apiHttpClient.get<PublishedAgentDetail>(`/ai-agents/${agentId}/publish/detail`);
}

const PUBLISH_DETAIL_KEY = ["agents", "publish", "detail"] as const;

export function usePublishedAgentDetailQuery(
    agentId: string | undefined,
    options?: { enabled?: boolean; refetchOnWindowFocus?: boolean },
) {
    const { isLogin } = useAuthStore((state) => state.authActions);
    const enabled = Boolean(agentId) && isLogin() && options?.enabled !== false;
    return useQuery<PublishedAgentDetail>({
        queryKey: [...PUBLISH_DETAIL_KEY, agentId ?? ""],
        queryFn: () => getPublishedAgentDetail(agentId!),
        enabled,
        refetchOnWindowFocus: options?.refetchOnWindowFocus,
    });
}

export type PublishAgentToSquareParams = {
    tagIds: string[];
    allowCopy?: boolean;
};

export async function publishAgentToSquare(
    agentId: string,
    params: PublishAgentToSquareParams,
): Promise<Agent> {
    return apiHttpClient.post<Agent>(`/ai-agents/${agentId}/publish-to-square`, params);
}

export async function unpublishAgentFromSquare(agentId: string): Promise<Agent> {
    return apiHttpClient.post<Agent>(`/ai-agents/${agentId}/unpublish-from-square`);
}

export type UpdatePublishConfigParams = {
    enableSite?: boolean;
    enableApiKey?: boolean;
    allowCopy?: boolean;
    regenerateAccessToken?: boolean;
    regenerateApiKey?: boolean;
};

export async function updatePublishConfig(
    agentId: string,
    params: UpdatePublishConfigParams,
): Promise<Agent> {
    return apiHttpClient.patch<Agent>(`/ai-agents/${agentId}/publish/config`, params);
}

export function useUpdatePublishConfigMutation(
    agentId: string,
): UseMutationResult<Agent, unknown, UpdatePublishConfigParams, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => updatePublishConfig(agentId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...AGENT_DETAIL_KEY, agentId] });
            queryClient.invalidateQueries({ queryKey: [...PUBLISH_DETAIL_KEY, agentId] });
        },
    });
}

export async function listSquareAgents(params?: ListSquareAgentsParams): Promise<ListAgentsResult> {
    const search = new URLSearchParams();
    const page = params?.page;
    const pageSize = params?.pageSize;
    const keyword = params?.keyword;
    const tagIds = params?.tagIds;
    if (page) search.set("page", String(page));
    if (pageSize) search.set("pageSize", String(pageSize));
    if (keyword?.trim()) search.set("keyword", keyword.trim());
    if (tagIds?.length) tagIds.forEach((id) => search.append("tagIds", id));
    const qs = search.toString();
    return apiHttpClient.get<ListAgentsResult>(
        qs ? `/ai-agents/square?${qs}` : "/ai-agents/square",
    );
}

const SQUARE_LIST_KEY = ["agents", "square"] as const;

export function useSquareAgentsInfiniteQuery(
    params: { pageSize?: number; keyword?: string; tagIds?: string[] } = {},
    options?: { enabled?: boolean },
): UseInfiniteQueryResult<InfiniteData<ListAgentsResult>, unknown> {
    const { pageSize = 20, keyword, tagIds } = params;
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useInfiniteQuery<ListAgentsResult>({
        queryKey: [...SQUARE_LIST_KEY, pageSize, keyword ?? "", tagIds ?? []],
        queryFn: ({ pageParam }) =>
            listSquareAgents({ page: pageParam as number, pageSize, keyword, tagIds }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
        enabled: isLogin() && options?.enabled !== false,
        ...options,
    });
}

export function useAgentTags() {
    return useQuery<Tag[]>({
        queryKey: ["tags", "agent"],
        queryFn: () => listTags({ type: "app" }),
    });
}

const AGENT_DETAIL_KEY = ["agents", "detail"] as const;

export function useAgentDetailQuery(
    agentId?: string,
    options?: { enabled?: boolean; refetchOnWindowFocus?: boolean },
) {
    const { isLogin } = useAuthStore((state) => state.authActions);
    const enabled = Boolean(agentId) && isLogin() && options?.enabled !== false;
    return useQuery<Agent>({
        queryKey: [...AGENT_DETAIL_KEY, agentId ?? ""],
        queryFn: () => getAgent(agentId as string),
        enabled,
        refetchOnWindowFocus: options?.refetchOnWindowFocus,
    });
}

export function usePublishAgentToSquareMutation(
    agentId: string,
): UseMutationResult<Agent, unknown, PublishAgentToSquareParams, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload) => publishAgentToSquare(agentId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...AGENT_DETAIL_KEY, agentId] });
            queryClient.invalidateQueries({ queryKey: ["agents"] });
        },
    });
}

export function useUnpublishAgentFromSquareMutation(
    agentId: string,
): UseMutationResult<Agent, unknown, void, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => unpublishAgentFromSquare(agentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...AGENT_DETAIL_KEY, agentId] });
            queryClient.invalidateQueries({ queryKey: ["agents"] });
        },
    });
}

export type ListMyAgentsParams = {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: "all" | "published" | "unpublished";
};

export async function listMyAgents(params?: ListMyAgentsParams): Promise<ListAgentsResult> {
    const search = new URLSearchParams();
    const page = params?.page;
    const pageSize = params?.pageSize;
    const keyword = params?.keyword;
    const status = params?.status;
    if (page) search.set("page", String(page));
    if (pageSize) search.set("pageSize", String(pageSize));
    if (keyword?.trim()) search.set("keyword", keyword.trim());
    if (status) search.set("status", status);
    const qs = search.toString();
    return apiHttpClient.get<ListAgentsResult>(
        qs ? `/ai-agents/my-created?${qs}` : "/ai-agents/my-created",
    );
}

const MY_CREATED_LIST_KEY = ["agents", "my-created"] as const;

export async function getAgentDashboard(
    agentId: string,
    params?: { startTime?: string; endTime?: string },
): Promise<AgentDashboardResult> {
    const search = new URLSearchParams();
    if (params?.startTime) search.set("startTime", params.startTime);
    if (params?.endTime) search.set("endTime", params.endTime);
    const qs = search.toString();
    return apiHttpClient.get<AgentDashboardResult>(
        qs ? `/ai-agents/${agentId}/dashboard?${qs}` : `/ai-agents/${agentId}/dashboard`,
    );
}

const DASHBOARD_KEY = ["agents", "dashboard"] as const;

export function useAgentDashboardQuery(
    agentId: string | undefined,
    params?: { startTime?: string; endTime?: string },
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: [...DASHBOARD_KEY, agentId ?? "", params],
        queryFn: () => getAgentDashboard(agentId!, params),
        enabled: !!agentId && options?.enabled !== false,
    });
}

export async function copyAgentFromSquare(agentId: string): Promise<Agent> {
    return apiHttpClient.post<Agent>(`/ai-agents/${agentId}/copy-from-square`, {});
}

export function useCopyAgentFromSquareMutation(
    agentId: string,
): UseMutationResult<Agent, unknown, void, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => copyAgentFromSquare(agentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...MY_CREATED_LIST_KEY] });
            queryClient.invalidateQueries({ queryKey: ["agents"] });
        },
    });
}

export async function deleteAgent(agentId: string): Promise<void> {
    await apiHttpClient.delete<void>(`/ai-agents/${agentId}`);
}

export function useDeleteAgentMutation(): UseMutationResult<void, unknown, string, unknown> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (agentId: string) => deleteAgent(agentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...MY_CREATED_LIST_KEY] });
            queryClient.invalidateQueries({ queryKey: ["agents"] });
        },
    });
}

export function useMyAgentsInfiniteQuery(
    params: {
        pageSize?: number;
        keyword?: string;
        status?: "all" | "published" | "unpublished";
    } = {},
    options?: { enabled?: boolean },
): UseInfiniteQueryResult<InfiniteData<ListAgentsResult>, unknown> {
    const { pageSize = 20, keyword, status } = params;
    const { isLogin } = useAuthStore((state) => state.authActions);
    return useInfiniteQuery<ListAgentsResult>({
        queryKey: [...MY_CREATED_LIST_KEY, pageSize, keyword ?? "", status ?? "all"],
        queryFn: ({ pageParam }) =>
            listMyAgents({ page: pageParam as number, pageSize, keyword, status }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
            lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
        enabled: isLogin() && options?.enabled !== false,
        ...options,
    });
}
