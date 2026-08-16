import type { QueryOptionsUtil } from "@buildingai/web-types";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type AgentSkill = {
    id: string;
    agentId: string;
    name: string;
    description?: string;
    instructions: string;
    sourceType: "upload" | "git";
    sourceRef: string;
    fileMeta?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
};

export type AddGitSkillParams = {
    gitUrl: string;
};

export function useAgentSkillsQuery(
    agentId: string,
    options?: QueryOptionsUtil<AgentSkill[]>,
): UseQueryResult<AgentSkill[], unknown> {
    return useQuery<AgentSkill[]>({
        queryKey: ["agent-skills", agentId],
        queryFn: () => apiHttpClient.get<AgentSkill[]>(`/ai-agent-skills/${agentId}`),
        enabled: !!agentId,
        ...options,
    });
}

export function useAddAgentSkillByUpload(): UseMutationResult<
    AgentSkill,
    unknown,
    { agentId: string; file: File },
    unknown
> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ agentId, file }: { agentId: string; file: File }) => {
            const formData = new FormData();
            formData.append("file", file);
            return apiHttpClient.post<AgentSkill>(
                `/ai-agent-skills/${agentId}/upload`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } },
            );
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["agent-skills", variables.agentId] });
        },
    });
}

export function useAddAgentSkillByGit(): UseMutationResult<
    AgentSkill,
    unknown,
    { agentId: string; gitUrl: string },
    unknown
> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ agentId, gitUrl }: { agentId: string; gitUrl: string }) =>
            apiHttpClient.post<AgentSkill>(`/ai-agent-skills/${agentId}/git`, { gitUrl }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["agent-skills", variables.agentId] });
        },
    });
}

export function useDeleteAgentSkill(): UseMutationResult<
    unknown,
    unknown,
    { agentId: string; id: string },
    unknown
> {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id }: { agentId: string; id: string }) =>
            apiHttpClient.delete(`/ai-agent-skills/${id}`),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["agent-skills", variables.agentId] });
        },
    });
}
