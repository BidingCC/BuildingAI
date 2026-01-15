import { useChat } from "@ai-sdk/react";
import { useAuthStore } from "@buildingai/stores";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatStatus, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const getApiBaseUrl = () => {
  const isDev = import.meta.env.DEV;
  const devBase = import.meta.env.VITE_DEVELOP_APP_BASE_URL || "http://localhost:4090";
  const prodBase = import.meta.env.VITE_PRODUCTION_APP_BASE_URL || "";
  return isDev ? devBase : prodBase;
};

export interface UseChatStreamOptions {
  modelId: string;
  onThreadCreated?: () => void;
  lastMessageDbIdRef: React.RefObject<string | null>;
  pendingParentIdRef: React.RefObject<string | null>;
  conversationIdRef: React.RefObject<string | undefined>;
  prevThreadIdRef: React.RefObject<string | undefined>;
}

export interface UseChatStreamReturn {
  currentThreadId?: string;
  messages: UIMessage[];
  status: ChatStatus;
  streamingMessageId: string | null;
  error: Error | null;
  setMessages: (messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void;
  regenerate: (messageId: string) => void;
  send: (content: string, parentId?: string | null) => void;
  stop: () => void;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}

export function useChatStream(options: UseChatStreamOptions): UseChatStreamReturn {
  const {
    modelId,
    onThreadCreated,
    lastMessageDbIdRef,
    pendingParentIdRef,
    conversationIdRef,
    prevThreadIdRef,
  } = options;

  const { id: currentThreadId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.auth.token);
  const queryClient = useQueryClient();

  const {
    messages,
    setMessages: setChatMessages,
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

  useEffect(() => {
    const prevThreadId = prevThreadIdRef.current;
    const isSwitchingConversation =
      prevThreadId && currentThreadId && prevThreadId !== currentThreadId;
    const isNavigatingToHome = prevThreadId && !currentThreadId;

    pendingParentIdRef.current = null;
    lastMessageDbIdRef.current = null;
    conversationIdRef.current = currentThreadId || undefined;

    if (isSwitchingConversation || isNavigatingToHome) {
      setChatMessages([]);
    }

    prevThreadIdRef.current = currentThreadId;
  }, [currentThreadId, setChatMessages]);

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
    [sendMessage, status, lastMessageDbIdRef],
  );

  const streamingMessageId =
    status === "streaming" && messages.length > 0
      ? messages[messages.length - 1]?.id || null
      : null;

  return {
    currentThreadId,
    messages,
    status,
    streamingMessageId,
    error: error || null,
    setMessages: setChatMessages,
    send,
    stop,
    regenerate: handleRegenerate,
    addToolApprovalResponse,
  };
}
