import { useChat } from "@ai-sdk/react";
import { getDatasetsConversationInfo } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatStatus, FileUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

const getApiBaseUrl = () => {
  const isDev = import.meta.env.DEV;
  const devBase = import.meta.env.VITE_DEVELOP_APP_BASE_URL || "http://localhost:4090";
  const prodBase = import.meta.env.VITE_PRODUCTION_APP_BASE_URL || "";
  return isDev ? devBase : prodBase;
};

export interface UseDatasetsChatStreamOptions {
  datasetId: string;
  modelId: string;
  feature?: Record<string, boolean>;
  lastMessageDbIdRef: React.RefObject<string | null>;
  pendingParentIdRef: React.RefObject<string | null>;
  conversationIdRef: React.RefObject<string | undefined>;
  prevDatasetIdRef: React.RefObject<string | undefined>;
}

export interface UseDatasetsChatStreamReturn {
  currentConversationId: string | undefined;
  setConversationId: (id: string | undefined) => void;
  messages: UIMessage[];
  status: ChatStatus;
  streamingMessageId: string | null;
  setMessages: (messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void;
  regenerate: (messageId: string) => void;
  send: (
    content: string,
    parentId?: string | null,
    files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
  ) => void;
  stop: () => void;
  addToolApprovalResponse?: (args: { id: string; approved: boolean; reason?: string }) => void;
}

export function useDatasetsChatStream(
  options: UseDatasetsChatStreamOptions,
): UseDatasetsChatStreamReturn {
  const {
    datasetId,
    modelId,
    feature,
    lastMessageDbIdRef,
    pendingParentIdRef,
    conversationIdRef,
    prevDatasetIdRef,
  } = options;

  const [currentConversationId, setCurrentConversationIdState] = useState<string | undefined>();

  const token = useAuthStore((state) => state.auth.token);
  const queryClient = useQueryClient();

  const datasetIdRef = useRef(datasetId);
  useEffect(() => {
    datasetIdRef.current = datasetId;
  }, [datasetId]);

  const modelIdRef = useRef(modelId);
  useEffect(() => {
    modelIdRef.current = modelId;
  }, [modelId]);

  const featureRef = useRef<Record<string, boolean> | undefined>(feature);
  useEffect(() => {
    featureRef.current = feature;
  }, [feature]);

  const {
    messages,
    setMessages: setChatMessages,
    sendMessage,
    stop,
    status,
    regenerate,
    addToolApprovalResponse,
  } = useChat({
    id: datasetId ? `datasets-${datasetId}` : "datasets-new",
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
      api: `${getApiBaseUrl()}/api/ai-datasets/${datasetId}/chat`,
      headers: { Authorization: token ? `Bearer ${token}` : "" },
      body: () => {
        const parentId = pendingParentIdRef.current;
        pendingParentIdRef.current = null;
        const currentFeature = featureRef.current;

        return {
          modelId: modelIdRef.current,
          conversationId: conversationIdRef.current || undefined,
          parentId,
          ...(currentFeature &&
            Object.keys(currentFeature).length > 0 && { feature: currentFeature }),
        };
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
        conversationIdRef.current = newConversationId;
        setCurrentConversationIdState(newConversationId);
        queryClient.invalidateQueries({
          queryKey: ["datasets", datasetIdRef.current, "conversations"],
        });
      }

      if (
        (data.type === "data-user-message-id" || data.type === "data-assistant-message-id") &&
        data.data
      ) {
        lastMessageDbIdRef.current = data.data as string;
      }
    },
    onFinish: () => {
      queryClient.invalidateQueries({
        queryKey: ["datasets", datasetIdRef.current, "conversations"],
      });

      const cid = conversationIdRef.current;
      const did = datasetIdRef.current;
      if (cid && did) {
        void getDatasetsConversationInfo(did, cid)
          .then((info) => {
            queryClient.setQueryData(["datasets", did, "conversation", cid], info);
          })
          .catch(() => {});
      }
    },
    onError: (error) => {
      console.error("Error streaming datasets chat", error);
      setChatMessages((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        const lastMessage = updated[lastIndex];
        if (lastMessage && lastMessage.role === "assistant") {
          updated[lastIndex] = {
            ...lastMessage,
            parts: [
              ...(lastMessage.parts || []),
              {
                type: "data-error",
                data: error?.message || "Unknown error",
              },
            ],
          };
        }
        return updated;
      });
    },
  });

  useEffect(() => {
    conversationIdRef.current = currentConversationId;
  }, [currentConversationId, conversationIdRef]);

  useEffect(() => {
    const prevId = prevDatasetIdRef.current;
    const isDatasetChange = prevId && prevId !== datasetId;

    if (isDatasetChange) {
      if (status === "streaming") {
        stop();
      }
      setChatMessages([]);
      setCurrentConversationIdState(undefined);
    }

    pendingParentIdRef.current = null;
    lastMessageDbIdRef.current = null;
    if (isDatasetChange) {
      conversationIdRef.current = undefined;
    }
    prevDatasetIdRef.current = datasetId;
  }, [datasetId, setChatMessages, status, stop, prevDatasetIdRef]);

  const handleRegenerate = useCallback(
    (messageId: string) => {
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex > 0 && messages[msgIndex - 1].role === "user") {
        pendingParentIdRef.current = messages[msgIndex - 1].id;
      }
      regenerate({ messageId, body: { trigger: "regenerate-message" } });
    },
    [regenerate, messages, pendingParentIdRef],
  );

  const send = useCallback(
    (
      content: string,
      parentId?: string | null,
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
    ) => {
      if (status === "streaming") return;
      if (!content.trim() && (!files || files.length === 0)) return;
      pendingParentIdRef.current = parentId !== undefined ? parentId : lastMessageDbIdRef.current;

      const fileParts: FileUIPart[] | undefined =
        files && files.length > 0
          ? files.map((file) => ({
              type: "file" as const,
              url: file.url,
              mediaType: file.mediaType || "application/octet-stream",
              ...(file.filename && { filename: file.filename }),
            }))
          : undefined;

      sendMessage({
        text: content.trim() || "",
        ...(fileParts && { files: fileParts }),
      });
    },
    [sendMessage, status, lastMessageDbIdRef, pendingParentIdRef],
  );

  const streamingMessageId =
    status === "streaming" && messages.length > 0
      ? messages[messages.length - 1]?.id || null
      : null;

  const setConversationId = useCallback(
    (id: string | undefined) => {
      setCurrentConversationIdState(id);
      conversationIdRef.current = id;
    },
    [conversationIdRef],
  );

  return {
    currentConversationId,
    setConversationId,
    messages,
    status,
    streamingMessageId,
    setMessages: setChatMessages,
    send,
    stop,
    regenerate: handleRegenerate,
    addToolApprovalResponse,
  };
}
