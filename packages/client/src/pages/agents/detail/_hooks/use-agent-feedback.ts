import { useI18n } from "@buildingai/i18n";
import { addAgentMessageFeedback, removeAgentMessageLikeDislike } from "@buildingai/services/web";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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

export function useAgentFeedback(
  streamMessages: UIMessage[],
  agentId?: string,
  conversationId?: string,
) {
  const { t } = useI18n();
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [disliked, setDisliked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!streamMessages.length) return;

    const likedMap: Record<string, boolean> = {};
    const dislikedMap: Record<string, boolean> = {};

    for (const message of streamMessages) {
      const resolvedId = resolveMessageId(message, message.id);
      const key = resolvedId || message.id;
      const feedback = (message as unknown as { feedback?: { type?: "like" | "dislike" } })
        .feedback;
      const type = feedback?.type;
      if (type === "like") {
        likedMap[key] = true;
      } else if (type === "dislike") {
        dislikedMap[key] = true;
      }
    }

    setLiked(likedMap);
    setDisliked(dislikedMap);
  }, [streamMessages]);

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
            const next = { ...prev };
            delete next[messageKey];
            return next;
          });
        } else {
          setLiked((prev) => {
            const next = { ...prev };
            delete next[messageKey];
            return next;
          });
        }
      } else {
        if (value) {
          setDisliked((prev) => ({ ...prev, [messageKey]: true }));
          setLiked((prev) => {
            const next = { ...prev };
            delete next[messageKey];
            return next;
          });
        } else {
          setDisliked((prev) => {
            const next = { ...prev };
            delete next[messageKey];
            return next;
          });
        }
      }
    },
    [],
  );

  const handleLike = useCallback(
    async (messageKey: string, value: boolean) => {
      if (!agentId || !conversationId) return;
      try {
        const message = streamMessages.find((m) => m.id === messageKey);
        const messageId = resolveMessageId(message, messageKey);

        if (value) {
          await addAgentMessageFeedback(agentId, conversationId, messageId, { type: "like" });
        } else {
          await removeAgentMessageLikeDislike(agentId, conversationId, messageId, "like");
        }

        updateFeedbackState(messageKey, "like", value);
      } catch (error) {
        toast.error(t("agent.detail.feedback.operationFailed"), {
          description:
            error instanceof Error ? error.message : t("agent.detail.feedback.unknownError"),
        });
      }
    },
    [agentId, conversationId, streamMessages, updateFeedbackState],
  );

  const handleDislike = useCallback(
    async (messageKey: string, value: boolean, dislikeReason?: string) => {
      if (!agentId || !conversationId) return;
      try {
        const message = streamMessages.find((m) => m.id === messageKey);
        const messageId = resolveMessageId(message, messageKey);

        if (value) {
          await addAgentMessageFeedback(agentId, conversationId, messageId, {
            type: "dislike",
            dislikeReason,
          });
        } else {
          await removeAgentMessageLikeDislike(agentId, conversationId, messageId, "dislike");
        }

        updateFeedbackState(messageKey, "dislike", value);
      } catch (error) {
        toast.error(t("agent.detail.feedback.operationFailed"), {
          description:
            error instanceof Error ? error.message : t("agent.detail.feedback.unknownError"),
        });
      }
    },
    [agentId, conversationId, streamMessages, updateFeedbackState],
  );

  return {
    liked,
    disliked,
    onLike: handleLike,
    onDislike: handleDislike,
  };
}
