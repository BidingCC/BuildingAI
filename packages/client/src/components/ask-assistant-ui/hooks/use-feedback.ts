import {
  useCreateFeedbackMutation,
  useFeedbacksByConversationQuery,
  useUpdateFeedbackMutation,
} from "@buildingai/services/web";
import { useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * 从消息中解析真实的消息ID
 * 优先使用 data-assistant-message-id part 中的 data，否则使用 messageKey
 */
function resolveMessageId(message: UIMessage | undefined, messageKey: string): string {
  if (!message) return messageKey;

  const assistantMessageIdPart = message.parts?.find(
    (part) => part.type === "data-assistant-message-id",
  );

  if (assistantMessageIdPart && "data" in assistantMessageIdPart && assistantMessageIdPart.data) {
    return assistantMessageIdPart.data as string;
  }

  return messageKey;
}

export function useFeedback(streamMessages: UIMessage[], conversationId?: string) {
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [disliked, setDisliked] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const createFeedbackMutation = useCreateFeedbackMutation();
  const updateFeedbackMutation = useUpdateFeedbackMutation();

  const { data: feedbacks } = useFeedbacksByConversationQuery(conversationId);

  useEffect(() => {
    if (!feedbacks || !streamMessages.length) return;

    const messageIdToKeyMap = new Map<string, string>();
    streamMessages.forEach((message) => {
      const messageId = resolveMessageId(message, message.id);
      messageIdToKeyMap.set(messageId, message.id);
    });

    const likedMap: Record<string, boolean> = {};
    const dislikedMap: Record<string, boolean> = {};

    feedbacks.forEach((feedback) => {
      const messageKey = messageIdToKeyMap.get(feedback.messageId);
      if (!messageKey) return;

      if (feedback.type === "like") {
        likedMap[messageKey] = true;
      } else if (feedback.type === "dislike") {
        dislikedMap[messageKey] = true;
      }
    });

    setLiked(likedMap);
    setDisliked(dislikedMap);
  }, [feedbacks, streamMessages]);

  useEffect(() => {
    if (!conversationId) {
      setLiked({});
      setDisliked({});
    }
  }, [conversationId]);

  const updateFeedbackState = useCallback(
    (messageKey: string, type: "like" | "dislike", value: boolean) => {
      if (type === "like") {
        if (value) {
          setLiked((prev) => ({ ...prev, [messageKey]: true }));
          setDisliked((prev) => {
            const newState = { ...prev };
            delete newState[messageKey];
            return newState;
          });
        } else {
          setLiked((prev) => {
            const newState = { ...prev };
            delete newState[messageKey];
            return newState;
          });
        }
      } else {
        if (value) {
          setDisliked((prev) => ({ ...prev, [messageKey]: true }));
          setLiked((prev) => {
            const newState = { ...prev };
            delete newState[messageKey];
            return newState;
          });
        } else {
          setDisliked((prev) => {
            const newState = { ...prev };
            delete newState[messageKey];
            return newState;
          });
        }
      }
    },
    [],
  );

  const handleLike = useCallback(
    async (messageKey: string, value: boolean) => {
      try {
        const message = streamMessages.find((m) => m.id === messageKey);
        const messageId = resolveMessageId(message, messageKey);

        if (value) {
          await createFeedbackMutation.mutateAsync({
            messageId,
            type: "like",
          });
        } else {
          const feedback = feedbacks?.find((f) => f.messageId === messageId && f.type === "like");
          if (feedback?.id) {
            await createFeedbackMutation.mutateAsync({
              messageId,
              type: "like",
            });
          }
        }

        updateFeedbackState(messageKey, "like", value);
      } catch (error) {
        toast.error("操作失败", {
          description: error instanceof Error ? error.message : "未知错误",
        });
      }
    },
    [streamMessages, feedbacks, createFeedbackMutation, updateFeedbackState],
  );

  const handleDislike = useCallback(
    async (messageKey: string, value: boolean, dislikeReason?: string, isUpdate?: boolean) => {
      try {
        const message = streamMessages.find((m) => m.id === messageKey);
        const messageId = resolveMessageId(message, messageKey);

        if (value) {
          const conversationFeedbacks =
            queryClient.getQueryData<Array<{ id: string; messageId: string; type: string }>>([
              "feedbacks",
              "conversation",
              conversationId,
            ]) || feedbacks;

          const existingDislikeFeedback = conversationFeedbacks?.find(
            (f) => f.messageId === messageId && f.type === "dislike",
          );

          if (isUpdate && existingDislikeFeedback?.id) {
            await updateFeedbackMutation.mutateAsync({
              id: existingDislikeFeedback.id,
              dto: {
                type: "dislike",
                dislikeReason: dislikeReason || undefined,
              },
            });
          } else {
            await createFeedbackMutation.mutateAsync({
              messageId,
              type: "dislike",
              dislikeReason: dislikeReason || undefined,
            });
          }
        } else {
          const feedback = feedbacks?.find(
            (f) => f.messageId === messageId && f.type === "dislike",
          );
          if (feedback?.id) {
            await createFeedbackMutation.mutateAsync({
              messageId,
              type: "dislike",
            });
          }
        }

        updateFeedbackState(messageKey, "dislike", value);
      } catch (error) {
        toast.error("操作失败", {
          description: error instanceof Error ? error.message : "未知错误",
        });
      }
    },
    [
      streamMessages,
      conversationId,
      queryClient,
      feedbacks,
      createFeedbackMutation,
      updateFeedbackMutation,
      updateFeedbackState,
    ],
  );

  return {
    liked,
    disliked,
    onLike: handleLike,
    onDislike: handleDislike,
  };
}
