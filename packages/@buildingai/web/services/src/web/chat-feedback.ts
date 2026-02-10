import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type FeedbackType = "like" | "dislike";

export type FeedbackRecord = {
    id: string;
    messageId: string;
    userId?: string;
    type: FeedbackType;
    dislikeReason?: string;
    createdAt: string;
    updatedAt: string;
};

export type CreateFeedbackDto = {
    messageId: string;
    type: FeedbackType;
    dislikeReason?: string;
};

export type UpdateFeedbackDto = {
    type: FeedbackType;
    dislikeReason?: string;
};

export function useFeedbackQuery(messageId: string) {
    return useQuery<FeedbackRecord | null>({
        queryKey: ["feedback", messageId],
        queryFn: () =>
            apiHttpClient.get<FeedbackRecord | null>(`/ai-chat-feedback/message/${messageId}`),
        enabled: !!messageId,
    });
}

export function useFeedbacksByConversationQuery(conversationId: string | undefined) {
    return useQuery<FeedbackRecord[]>({
        queryKey: ["feedbacks", "conversation", conversationId],
        queryFn: () =>
            apiHttpClient.get<FeedbackRecord[]>(`/ai-chat-feedback/conversation/${conversationId}`),
        enabled: !!conversationId,
    });
}

export function useCreateFeedbackMutation() {
    const queryClient = useQueryClient();
    return useMutation<FeedbackRecord, Error, CreateFeedbackDto>({
        mutationFn: (dto) => apiHttpClient.post<FeedbackRecord>("/ai-chat-feedback", dto),
        onSuccess: (data) => {
            queryClient.setQueryData(["feedback", data.messageId], data);
            queryClient.setQueriesData<FeedbackRecord[]>(
                { queryKey: ["feedbacks", "conversation"] },
                (oldData) => {
                    if (!oldData) return [data];
                    const existing = oldData.find((f) => f.id === data.id);
                    if (existing) {
                        return oldData.map((f) => (f.id === data.id ? data : f));
                    }
                    return [...oldData, data];
                },
            );
            queryClient.invalidateQueries({ queryKey: ["feedbacks", "conversation"] });
        },
    });
}

export function useUpdateFeedbackMutation() {
    const queryClient = useQueryClient();
    return useMutation<FeedbackRecord, Error, { id: string; dto: UpdateFeedbackDto }>({
        mutationFn: ({ id, dto }) =>
            apiHttpClient.put<FeedbackRecord>(`/ai-chat-feedback/${id}`, dto),
        onSuccess: (data) => {
            queryClient.setQueryData(["feedback", data.messageId], data);
            queryClient.setQueriesData<FeedbackRecord[]>(
                { queryKey: ["feedbacks", "conversation"] },
                (oldData) => {
                    if (!oldData) return [data];
                    return oldData.map((f) => (f.id === data.id ? data : f));
                },
            );
            queryClient.invalidateQueries({ queryKey: ["feedbacks", "conversation"] });
        },
    });
}
