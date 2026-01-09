import { Chat, useChat } from "@ai-sdk/react";
import { useConversationMessagesQuery } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatStatus, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

const getApiBaseUrl = () => {
  const isDev = import.meta.env.DEV;
  const devBase = import.meta.env.VITE_DEVELOP_APP_BASE_URL || "http://localhost:4090";
  const prodBase = import.meta.env.VITE_PRODUCTION_APP_BASE_URL || "";
  return isDev ? devBase : prodBase;
};

export interface UseChatOptions {
  modelId: string;
  onThreadCreated?: () => void;
}

export interface UseChatReturn {
  currentThreadId?: string;
  messages: UIMessage[];
  isLoadingMessages: boolean;
  status: ChatStatus;
  streamingMessageId: string | null;
  error: Error | null;
  setMessages: (messages: UIMessage[]) => void;
  regenerate: (messageId: string) => void;
  send: (content: string) => void;
  stop: () => void;
}

export function useChatStream(options: UseChatOptions): UseChatReturn {
  const { modelId, onThreadCreated } = options;
  const { id: currentThreadId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.auth.token);
  const queryClient = useQueryClient();
  const conversationIdRef = useRef<string | undefined>(currentThreadId);
  const chatRef = useRef<Chat<UIMessage> | null>(null);
  const lastMessageDbIdRef = useRef<string | null>(null);
  const pendingParentIdRef = useRef<string | null>(null);

  const { data: messagesData, isLoading: isLoadingMessages } = useConversationMessagesQuery(
    { conversationId: currentThreadId || "", page: 1, pageSize: 100 },
    { enabled: !!currentThreadId, refetchOnWindowFocus: false },
  );

  const chat = useMemo(() => {
    if (!chatRef.current) {
      chatRef.current = new Chat<UIMessage>({
        id: "new",
        messages: [],
        transport: new DefaultChatTransport({
          api: `${getApiBaseUrl()}/api/ai-chat`,
          headers: { Authorization: token ? `Bearer ${token}` : "" },
          body: () => {
            const parentId = pendingParentIdRef.current;
            pendingParentIdRef.current = null;
            return { modelId, conversationId: conversationIdRef.current || undefined, parentId };
          },
        }),
        onData: (data) => {
          if (data.type === "data-conversation-id" && data.data) {
            const newConversationId = data.data as string;
            const isNewConversation = !conversationIdRef.current;
            conversationIdRef.current = newConversationId;

            if (isNewConversation) {
              navigate(`/c/${newConversationId}`);
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
            }
            onThreadCreated?.();
          }

          if (
            (data.type === "data-user-message-id" || data.type === "data-assistant-message-id") &&
            data.data
          ) {
            lastMessageDbIdRef.current = data.data as string;
          }
        },
        onFinish: () => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
        onError: () => console.error("Error streaming chat"),
      });
    }
    return chatRef.current;
  }, [modelId, token, navigate, queryClient, onThreadCreated]);

  const { messages, setMessages, sendMessage, stop, status, regenerate, error } = useChat({
    chat,
  });

  useEffect(() => {
    if (currentThreadId) {
      conversationIdRef.current = currentThreadId;
    } else if (!messagesData?.items.length) {
      conversationIdRef.current = undefined;
      setMessages([]);
    }
  }, [currentThreadId, setMessages]);

  useEffect(() => {
    if (!currentThreadId) return;

    if (messagesData?.items.length) {
      const sortedMessages = messagesData.items
        .sort((a, b) => a.sequence - b.sequence)
        .map((item) => ({
          ...item.message,
          id: item.id,
          metadata: {
            ...(item.message.metadata || {}),
            ...(item.parentId && { parentId: item.parentId }),
            ...(item.createdAt && { createdAt: item.createdAt }),
          },
        })) as UIMessage[];
      setMessages(sortedMessages);

      if (sortedMessages.length > 0) {
        lastMessageDbIdRef.current = sortedMessages[sortedMessages.length - 1].id;
      }
    } else if (messagesData?.items.length === 0 && !currentThreadId) {
      setMessages([]);
      lastMessageDbIdRef.current = null;
    }
  }, [currentThreadId, messagesData, setMessages]);

  const handleRegenerate = useCallback(
    (messageId: string) => {
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex > 0 && messages[msgIndex - 1].role === "user") {
        pendingParentIdRef.current = messages[msgIndex - 1].id;
      }
      regenerate({ messageId });
    },
    [regenerate, messages],
  );

  const send = useCallback(
    (content: string) => {
      if (!content.trim() || status === "streaming") return;
      pendingParentIdRef.current = lastMessageDbIdRef.current;
      sendMessage({ text: content.trim() });
    },
    [sendMessage, status],
  );

  const streamingMessageId =
    status === "streaming" && messages.length > 0
      ? messages[messages.length - 1]?.id || null
      : null;

  return {
    currentThreadId,
    messages,
    isLoadingMessages,
    status,
    streamingMessageId,
    error: error || null,
    setMessages,
    send,
    stop,
    regenerate: handleRegenerate,
  };
}
