import { useQuery } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type AgentChatRecordItem = {
    id: string;
    title?: string | null;
    agentId: string;
    userId?: string | null;
    anonymousIdentifier?: string | null;
    userName?: string;
    userAvatar?: string;
    messageCount: number;
    totalTokens: number;
    consumedPower: number;
    feedbackStatus?: { like: number; dislike: number } | null;
    metadata?: Record<string, any> | null;
    createdAt: string;
    updatedAt: string;
};

export type AgentChatMessageItem = {
    id: string;
    conversationId: string;
    agentId: string;
    role: "user" | "assistant" | "system";
    message: { role: string; parts?: unknown[]; [key: string]: unknown };
    status: "streaming" | "completed" | "failed";
    parentId?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ListAgentConversationsParams = {
    page?: number;
    pageSize?: number;
    keyword?: string;
    sortBy?: "createdAt" | "updatedAt";
    includeDebug?: boolean;
    includeAnonymous?: boolean;
};

export type ListAgentConversationsResult = {
    items: AgentChatRecordItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export async function listAgentConversations(
    agentId: string,
    params?: ListAgentConversationsParams,
): Promise<ListAgentConversationsResult> {
    const search = new URLSearchParams();
    if (params?.page != null) search.set("page", String(params.page));
    if (params?.pageSize != null) search.set("pageSize", String(params.pageSize));
    if (params?.keyword != null && params.keyword.trim())
        search.set("keyword", params.keyword.trim());
    if (params?.sortBy != null) search.set("sortBy", params.sortBy);
    if (params?.includeDebug != null) search.set("includeDebug", String(params.includeDebug));
    if (params?.includeAnonymous != null)
        search.set("includeAnonymous", String(params.includeAnonymous));
    const qs = search.toString();
    const path = qs
        ? `/ai-agents/${agentId}/chat/conversations?${qs}`
        : `/ai-agents/${agentId}/chat/conversations`;
    return apiHttpClient.get<ListAgentConversationsResult>(path);
}

export type ListConversationMessagesParams = {
    page?: number;
    pageSize?: number;
};

export type ListConversationMessagesResult = {
    items: AgentChatMessageItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export async function listAgentConversationMessages(
    agentId: string,
    conversationId: string,
    params?: ListConversationMessagesParams,
): Promise<ListConversationMessagesResult> {
    const search = new URLSearchParams();
    if (params?.page != null) search.set("page", String(params.page));
    if (params?.pageSize != null) search.set("pageSize", String(params.pageSize));
    const qs = search.toString();
    const path = qs
        ? `/ai-agents/${agentId}/chat/conversations/${conversationId}/messages?${qs}`
        : `/ai-agents/${agentId}/chat/conversations/${conversationId}/messages`;
    return apiHttpClient.get<ListConversationMessagesResult>(path);
}

const CONVERSATIONS_KEY = ["agents", "chat", "conversations"] as const;
const MESSAGES_KEY = ["agents", "chat", "messages"] as const;

export function useAgentConversationsQuery(
    agentId: string | undefined,
    params?: ListAgentConversationsParams,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: [...CONVERSATIONS_KEY, agentId ?? "", params],
        queryFn: () => listAgentConversations(agentId!, params),
        enabled: !!agentId && options?.enabled !== false,
    });
}

export function useAgentConversationMessagesQuery(
    agentId: string | undefined,
    conversationId: string | undefined,
    params?: ListConversationMessagesParams,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: [...MESSAGES_KEY, agentId ?? "", conversationId ?? "", params],
        queryFn: () => listAgentConversationMessages(agentId!, conversationId!, params),
        enabled: !!agentId && !!conversationId && options?.enabled !== false,
    });
}
