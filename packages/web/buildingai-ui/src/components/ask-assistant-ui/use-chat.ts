import { useChat as useAiChat } from "@ai-sdk/react";
import { useAuthStore } from "@buildingai/stores";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

import type { ChatStatus, Message } from "./types";

export interface UseChatOptions {
  currentThreadId?: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  modelId: string;
  onThreadCreated?: () => void;
  skipNextLoad?: (threadId: string) => void;
}

export interface UseChatReturn {
  status: ChatStatus;
  streamingMessageId: string | null;
  send: (content: string) => void;
  stop: () => void;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const { currentThreadId, setMessages, onThreadCreated, skipNextLoad } = options;
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.auth.token);
  const queryClient = useQueryClient();
  const conversationIdRef = useRef<string | undefined>(currentThreadId);
  const pendingConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    conversationIdRef.current = currentThreadId;
  }, [currentThreadId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `http://localhost:4090/api/ai-chat`,
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: () => ({
          data: {
            modelId: "5f325ca6-03da-4f7f-8e42-025474e48b44",
            conversationId:
              conversationIdRef.current || pendingConversationIdRef.current || undefined,
          },
        }),
      }),
    [token],
  );

  const {
    messages: aiMessages,
    sendMessage,
    stop: aiStop,
    status: aiStatus,
  } = useAiChat({
    transport,
    onData: (data) => {
      if (data.type === "data-conversation_id" && data.data) {
        const newConversationId = data.data as string;
        const isNewConversation = !currentThreadId;

        conversationIdRef.current = newConversationId;
        pendingConversationIdRef.current = null;
        skipNextLoad?.(newConversationId);
        navigate(`/c/${newConversationId}`);

        if (isNewConversation) {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }

        onThreadCreated?.();
      }
    },
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => {
      pendingConversationIdRef.current = null;
    },
  });

  const send = useCallback(
    (content: string) => {
      if (!content.trim() || aiStatus === "streaming") return;

      sendMessage({
        text: content.trim(),
      });
    },
    [sendMessage, aiStatus],
  );

  const stop = useCallback(() => {
    aiStop();
  }, [aiStop]);

  useEffect(() => {
    const convertedMessages: Message[] = aiMessages.map((msg, index) => {
      let textContent = "";

      if (Array.isArray(msg.parts)) {
        textContent = msg.parts
          .filter((part: { type: string }) => part.type === "text")
          .map((part: { type: string; text?: string }) => (part.type === "text" ? part.text : ""))
          .join("");
      }

      return {
        key: msg.id || `msg-${index}`,
        from: msg.role === "user" ? "user" : "assistant",
        content: textContent,
      };
    });

    setMessages(convertedMessages);
  }, [aiMessages, setMessages]);

  const status: ChatStatus = aiStatus === "streaming" ? "streaming" : "ready";
  const streamingMessageId =
    aiStatus === "streaming" && aiMessages.length > 0
      ? aiMessages[aiMessages.length - 1]?.id || null
      : null;

  return { status, streamingMessageId, send, stop };
}
