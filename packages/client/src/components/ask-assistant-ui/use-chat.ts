import { useChat } from "@ai-sdk/react";
import { getConversationMessages, useConversationMessagesQuery } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatStatus, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
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
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  loadMoreMessages: () => void;
  status: ChatStatus;
  streamingMessageId: string | null;
  error: Error | null;
  setMessages: (messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void;
  regenerate: (messageId: string) => void;
  send: (content: string, parentId?: string | null) => void;
  stop: () => void;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}

export function useChatStream(options: UseChatOptions): UseChatReturn {
  const { modelId, onThreadCreated } = options;
  const { id: currentThreadId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.auth.token);
  const queryClient = useQueryClient();
  const conversationIdRef = useRef<string | undefined>(currentThreadId);
  const lastMessageDbIdRef = useRef<string | null>(null);
  const pendingParentIdRef = useRef<string | null>(null);

  const pageSize = 20;
  const { data: messagesData, isLoading: isLoadingMessages } = useConversationMessagesQuery(
    { conversationId: currentThreadId || "", page: 1, pageSize },
    { enabled: !!currentThreadId, refetchOnWindowFocus: false },
  );

  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const nextPageRef = useRef(2);
  const loadMoreLockRef = useRef(false);

  const {
    messages,
    setMessages,
    sendMessage,
    stop,
    status,
    regenerate,
    error,
    addToolApprovalResponse,
  } = useChat({
    id: "new",
    sendAutomaticallyWhen: ({ messages: currentMessages }) => {
      const lastMessage = currentMessages.at(-1);
      const shouldContinue =
        lastMessage?.parts?.some(
          (part) =>
            "state" in part &&
            part.state === "approval-responded" &&
            "approval" in part &&
            (part.approval as { approved?: boolean })?.approved === true,
        ) ?? false;
      return shouldContinue;
    },
    transport: new DefaultChatTransport({
      api: `${getApiBaseUrl()}/api/ai-chat`,
      headers: { Authorization: token ? `Bearer ${token}` : "" },
      body: () => {
        const parentId = pendingParentIdRef.current;
        pendingParentIdRef.current = null;
        return { modelId, conversationId: conversationIdRef.current || undefined, parentId };
      },
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);

        const isToolApprovalContinuation = request.messages.some((msg) =>
          msg.parts?.some((part) => {
            const state = (part as { state?: string }).state;
            return state === "approval-responded" || state === "output-denied";
          }),
        );

        return {
          body: {
            ...request.body,
            ...(isToolApprovalContinuation
              ? { message: lastMessage }
              : { messages: request.messages }),
          },
        };
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

  const mergeAndSortMessages = useCallback((base: UIMessage[], incoming: UIMessage[]) => {
    const map = new Map<string, UIMessage>();
    for (const m of base) map.set(m.id, m);
    for (const m of incoming) {
      if (!map.has(m.id)) map.set(m.id, m);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const sa = (a.metadata as { sequence?: number } | undefined)?.sequence;
      const sb = (b.metadata as { sequence?: number } | undefined)?.sequence;
      const na = typeof sa === "number" ? sa : Number.POSITIVE_INFINITY;
      const nb = typeof sb === "number" ? sb : Number.POSITIVE_INFINITY;
      return na - nb;
    });
    return arr;
  }, []);

  useEffect(() => {
    pendingParentIdRef.current = null;
    lastMessageDbIdRef.current = null;
    conversationIdRef.current = currentThreadId || undefined;
    setHasMoreMessages(false);
    nextPageRef.current = 2;
    loadMoreLockRef.current = false;
    setIsLoadingMoreMessages(false);
    if (!currentThreadId && !messagesData?.items.length) {
      setMessages([]);
    }
  }, [currentThreadId, setMessages, stop]);

  useEffect(() => {
    if (!currentThreadId) return;

    if (messagesData?.items.length) {
      setHasMoreMessages(messagesData.page < messagesData.totalPages);
      nextPageRef.current = Math.max(2, messagesData.page + 1);

      const pageMessages = messagesData.items
        .sort((a, b) => a.sequence - b.sequence)
        .map((item) => ({
          ...item.message,
          id: item.id,
          metadata: {
            ...(item.message.metadata || {}),
            sequence: item.sequence,
            ...(item.parentId && { parentId: item.parentId }),
            ...(item.createdAt && { createdAt: item.createdAt }),
          },
        })) as UIMessage[];

      // If the user already has local (streaming) messages, keep them and merge DB messages in.
      setMessages((prev) => {
        const merged = mergeAndSortMessages(prev, pageMessages);
        if (merged.length > 0) {
          lastMessageDbIdRef.current = merged[merged.length - 1].id;
        }
        return merged;
      });
    }
  }, [currentThreadId, messagesData, mergeAndSortMessages, setMessages]);

  const loadMoreMessages = useCallback(() => {
    const conversationId = currentThreadId;
    if (!conversationId) return;
    if (!hasMoreMessages) return;
    if (isLoadingMoreMessages) return;
    if (loadMoreLockRef.current) return;

    loadMoreLockRef.current = true;
    setIsLoadingMoreMessages(true);

    const page = nextPageRef.current;
    void getConversationMessages({ conversationId, page, pageSize })
      .then((res) => {
        setHasMoreMessages(res.page < res.totalPages);
        nextPageRef.current = res.page + 1;

        const incoming = res.items
          .sort((a, b) => a.sequence - b.sequence)
          .map((item) => ({
            ...item.message,
            id: item.id,
            metadata: {
              ...(item.message.metadata || {}),
              sequence: item.sequence,
              ...(item.parentId && { parentId: item.parentId }),
              ...(item.createdAt && { createdAt: item.createdAt }),
            },
          })) as UIMessage[];

        setMessages((prev) => mergeAndSortMessages(prev, incoming));
      })
      .catch(() => {
        // Keep silent here; UI can choose to show toast if needed.
      })
      .finally(() => {
        setIsLoadingMoreMessages(false);
        loadMoreLockRef.current = false;
      });
  }, [
    currentThreadId,
    hasMoreMessages,
    isLoadingMoreMessages,
    mergeAndSortMessages,
    pageSize,
    setMessages,
  ]);

  const handleRegenerate = useCallback(
    (messageId: string) => {
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex > 0 && messages[msgIndex - 1].role === "user") {
        pendingParentIdRef.current = messages[msgIndex - 1].id;
      }
      regenerate({ messageId, body: { trigger: "regenerate-message" } });
    },
    [regenerate, messages],
  );

  const send = useCallback(
    (content: string, parentId?: string | null) => {
      if (!content.trim() || status === "streaming") return;
      pendingParentIdRef.current = parentId !== undefined ? parentId : lastMessageDbIdRef.current;
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
    isLoadingMoreMessages,
    hasMoreMessages,
    loadMoreMessages,
    status,
    streamingMessageId,
    error: error || null,
    setMessages,
    send,
    stop,
    regenerate: handleRegenerate,
    addToolApprovalResponse,
  };
}
