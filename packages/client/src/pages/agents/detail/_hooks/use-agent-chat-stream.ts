import { useChat } from "@ai-sdk/react";
import { type AgentChatMessageItem, listAgentConversationMessages } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatStatus, FileUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { validate as isUUID } from "uuid";

import { getApiBaseUrl } from "@/utils/api";

const STOP_FINALIZE_DELAY_MS = 350;
const USAGE_HYDRATE_RETRY_INTERVAL_MS = 500;
const USAGE_HYDRATE_MAX_ATTEMPTS = 5;
const USAGE_HYDRATE_PAGE_SIZE = 2;

export interface UseAgentChatStreamOptions {
  agentId: string;
  saveConversation?: boolean;
  isDebug?: boolean;
  formVariables?: Record<string, string>;
  formFieldsInputs?: Record<string, unknown>;
  feature?: Record<string, boolean>;
  lastMessageDbIdRef: React.RefObject<string | null>;
  pendingParentIdRef: React.RefObject<string | null>;
  conversationIdRef: React.RefObject<string | undefined>;
  routeConversationId?: string;
  disableAutoNavigate?: boolean;
}

export interface UseAgentChatStreamReturn {
  conversationId: string | undefined;
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
  getDbMessageId: (clientMessageId: string) => string | undefined;
}

export function useAgentChatStream(options: UseAgentChatStreamOptions): UseAgentChatStreamReturn {
  const {
    agentId,
    saveConversation = true,
    isDebug = false,
    formVariables,
    formFieldsInputs,
    feature,
    lastMessageDbIdRef,
    pendingParentIdRef,
    conversationIdRef,
    routeConversationId,
    disableAutoNavigate = false,
  } = options;

  const token = useAuthStore((state) => state.auth.token);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [conversationIdState, setConversationIdState] = useState<string | undefined>(undefined);
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const finalizedTokenRef = useRef<string | null>(null);
  const formVariablesRef = useRef(formVariables);
  const formFieldsInputsRef = useRef(formFieldsInputs);
  const featureRef = useRef<Record<string, boolean> | undefined>(feature);
  const messagesRef = useRef<UIMessage[]>([]);
  const messageDbIdMapRef = useRef<Map<string, string>>(new Map());
  const pendingUserDbIdRef = useRef<string | null>(null);
  const pendingAssistantDbIdRef = useRef<string | null>(null);
  const [statusOverride, setStatusOverride] = useState<ChatStatus | null>(null);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      pendingTimeoutsRef.current.delete(id);
      fn();
    }, ms);
    pendingTimeoutsRef.current.add(id);
    return id;
  }, []);

  useEffect(() => {
    const timeouts = pendingTimeoutsRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, []);

  const finalizeConversationSideEffects = useCallback(
    (token?: string) => {
      if (token) {
        if (finalizedTokenRef.current === token) return;
        finalizedTokenRef.current = token;
      }

      queryClient.invalidateQueries({ queryKey: ["agents", "chat", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["user", "info"] });
    },
    [queryClient],
  );

  useEffect(() => {
    formVariablesRef.current = formVariables;
    formFieldsInputsRef.current = formFieldsInputs;
  }, [formVariables, formFieldsInputs]);
  useEffect(() => {
    featureRef.current = feature;
  }, [feature]);

  const resolveMessageDbId = useCallback(
    (messageId: string | null | undefined): string | undefined => {
      if (!messageId) return undefined;
      return (
        messageDbIdMapRef.current.get(messageId) ?? (isUUID(messageId) ? messageId : undefined)
      );
    },
    [],
  );

  const mapLatestMessageId = useCallback((role: UIMessage["role"], dbId: string): boolean => {
    const latest = [...messagesRef.current].reverse().find((message) => message.role === role);
    if (!latest) return false;

    messageDbIdMapRef.current.set(latest.id, dbId);
    return true;
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${getApiBaseUrl()}/api/ai-agents/${agentId}/chat/stream`,
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        body: () => {
          const parentId = pendingParentIdRef.current;
          pendingParentIdRef.current = null;
          const fv = formVariablesRef.current;
          const ffi = formFieldsInputsRef.current;
          const currentFeature = featureRef.current;
          const currentConversationId = conversationIdRef.current;
          return {
            conversationId:
              currentConversationId && isUUID(currentConversationId)
                ? currentConversationId
                : undefined,
            ...(saveConversation === false && { saveConversation: false }),
            ...(isDebug && { isDebug: true }),
            ...(fv && Object.keys(fv).length > 0 && { formVariables: fv }),
            ...(ffi && Object.keys(ffi).length > 0 && { formFieldsInputs: ffi }),
            ...(currentFeature &&
              Object.keys(currentFeature).length > 0 && { feature: currentFeature }),
            ...(parentId !== undefined && parentId !== null && { parentId }),
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
    [agentId, token, saveConversation, isDebug],
  );

  const {
    messages,
    setMessages: setChatMessages,
    sendMessage,
    stop,
    status,
    regenerate,
    addToolApprovalResponse,
  } = useChat({
    id: `agent-chat-${agentId}`,
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
    transport,
    onData: (data) => {
      if (data.type === "data-conversation-id" && data.data) {
        const id = data.data as string;
        if (isUUID(id)) {
          const isNewConversation = !conversationIdRef.current;
          conversationIdRef.current = id;
          setConversationIdState(id);
          if (isNewConversation && !disableAutoNavigate) {
            navigate(`/agents/${agentId}/c/${id}`, { replace: true });
            queryClient.invalidateQueries({ queryKey: ["agents", "chat", "conversations"] });
          }
        }
      }
      if (data.type === "data-user-message-id" && data.data) {
        lastMessageDbIdRef.current = data.data as string;
        pendingUserDbIdRef.current = data.data as string;
        if (mapLatestMessageId("user", data.data as string)) {
          pendingUserDbIdRef.current = null;
        }
      }
      if (data.type === "data-assistant-message-id" && data.data) {
        lastMessageDbIdRef.current = data.data as string;
        pendingAssistantDbIdRef.current = data.data as string;
        if (mapLatestMessageId("assistant", data.data as string)) {
          pendingAssistantDbIdRef.current = null;
        }
      }
    },
    onFinish: () => {
      const conversationId = conversationIdRef.current;
      const lastAssistantId = [...messagesRef.current]
        .reverse()
        .find((m) => m.role === "assistant")?.id;
      const token =
        conversationId && lastAssistantId ? `${conversationId}:${lastAssistantId}` : undefined;
      finalizeConversationSideEffects(token);
    },
    onError: (error) => {
      console.error("Agent chat stream error:", error);
      const message = error?.message || "Unknown error";
      setStatusOverride("error");
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
                data: message,
              },
            ],
          };
          return updated;
        }
        // If the stream fails before an assistant message is created,
        // insert a synthetic assistant error message so the UI can display it.
        updated.push({
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [{ type: "data-error", data: message }],
        });
        return updated;
      });
    },
  });

  messagesRef.current = messages;

  const hydrateLastAssistantUsageFromServer = useCallback(async (): Promise<void> => {
    const conversationId = conversationIdRef.current;
    if (!conversationId) return;

    const lastAssistant = [...messagesRef.current].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    const targetClientId = lastAssistant.id;
    const targetDbId = messageDbIdMapRef.current.get(targetClientId);

    const isStillTargetable = (): boolean => {
      if (conversationIdRef.current !== conversationId) return false;
      return messagesRef.current.some((m) => m.id === targetClientId && m.role === "assistant");
    };

    const getUsage = (record: AgentChatMessageItem) => {
      const message = record.message as {
        id?: string;
        role?: string;
        usage?: Record<string, unknown> | null;
        userConsumedPower?: number | null;
      };
      return {
        message,
        usage: message.usage ?? undefined,
        userConsumedPower: message.userConsumedPower ?? undefined,
      };
    };

    const findRecord = (items: AgentChatMessageItem[]): AgentChatMessageItem | undefined => {
      const matched = items.find((record) => {
        const message = record.message as { id?: string };
        return (targetDbId != null && record.id === targetDbId) || message.id === targetClientId;
      });
      if (matched) return matched;

      return items.find((record) => {
        const { message, usage, userConsumedPower } = getUsage(record);
        return message.role === "assistant" && (usage != null || userConsumedPower != null);
      });
    };

    const applyUsage = (record: AgentChatMessageItem): void => {
      const { usage, userConsumedPower } = getUsage(record);
      if (!usage && userConsumedPower == null) return;

      setChatMessages((prev) =>
        prev.map((m) => {
          if (m.id !== targetClientId) return m;
          const nextMetadata: Record<string, unknown> =
            m.metadata && typeof m.metadata === "object"
              ? { ...(m.metadata as Record<string, unknown>) }
              : {};
          if (usage) nextMetadata.usage = usage;
          if (userConsumedPower != null) nextMetadata.userConsumedPower = userConsumedPower;

          const usagePayload = {
            ...(usage ?? {}),
            ...(userConsumedPower != null ? { userConsumedPower } : {}),
          };
          const usagePart = { type: "data-usage" as const, data: usagePayload };
          const nextParts = Array.isArray(m.parts) ? [...m.parts] : [];
          const usageIndex = nextParts.findIndex(
            (part) =>
              part && typeof part === "object" && (part as { type?: string }).type === "data-usage",
          );
          if (usageIndex >= 0) {
            nextParts[usageIndex] = usagePart as (typeof nextParts)[number];
          } else {
            nextParts.push(usagePart as (typeof nextParts)[number]);
          }

          return {
            ...m,
            metadata: nextMetadata as UIMessage["metadata"],
            parts: nextParts,
          };
        }),
      );
    };

    const sleep = (ms: number): Promise<void> =>
      new Promise((resolve) => {
        scheduleTimeout(resolve, ms);
      });

    for (let attempt = 0; attempt < USAGE_HYDRATE_MAX_ATTEMPTS; attempt += 1) {
      if (!isStillTargetable()) return;

      let record: AgentChatMessageItem | undefined;
      try {
        const res = await listAgentConversationMessages(agentId, conversationId, {
          page: 1,
          pageSize: USAGE_HYDRATE_PAGE_SIZE,
        });
        record = findRecord(res.items ?? []);
      } catch (error) {
        console.warn("Failed to fetch agent conversation messages for usage hydration", error);
      }

      if (!isStillTargetable()) return;

      if (record) {
        const { usage, userConsumedPower } = getUsage(record);
        if (usage != null || userConsumedPower != null) {
          applyUsage(record);
          return;
        }
      }

      if (attempt + 1 < USAGE_HYDRATE_MAX_ATTEMPTS) {
        await sleep(USAGE_HYDRATE_RETRY_INTERVAL_MS);
      }
    }
  }, [agentId, conversationIdRef, scheduleTimeout, setChatMessages]);

  const handleRegenerate = useCallback(
    (messageId: string) => {
      setStatusOverride(null);
      const msgIndex = messages.findIndex(
        (m) => m.id === messageId || resolveMessageDbId(m.id) === messageId,
      );
      if (msgIndex < 0) return;

      const msg = messages[msgIndex];
      if (msg.role === "user") {
        pendingParentIdRef.current = resolveMessageDbId(msg.id) ?? null;
      } else if (msgIndex > 0 && messages[msgIndex - 1].role === "user") {
        pendingParentIdRef.current = resolveMessageDbId(messages[msgIndex - 1].id) ?? null;
      }

      regenerate({
        messageId: msg.id,
        body: { trigger: "regenerate-message" },
      });
    },
    [regenerate, messages, resolveMessageDbId],
  );

  const send = useCallback(
    (
      content: string,
      parentId?: string | null,
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
    ) => {
      if (status === "streaming") return;
      if (!content.trim() && (!files || files.length === 0)) return;
      setStatusOverride(null);
      pendingParentIdRef.current =
        parentId !== undefined
          ? (resolveMessageDbId(parentId) ?? null)
          : lastMessageDbIdRef.current;

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
    [sendMessage, status, lastMessageDbIdRef, resolveMessageDbId],
  );

  const streamingMessageId =
    status === "streaming" && messages.length > 0
      ? messages[messages.length - 1]?.id || null
      : null;

  useEffect(() => {
    if (messages.length === 0) {
      setStatusOverride(null);
    }
  }, [messages.length]);

  useEffect(() => {
    if (messages.length === 0) {
      messageDbIdMapRef.current.clear();
      pendingUserDbIdRef.current = null;
      pendingAssistantDbIdRef.current = null;
      return;
    }

    const last = messages[messages.length - 1];
    const lastUserIndex = [...messages]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find(({ message }: { message: UIMessage }) => message.role === "user")?.index;
    if (lastUserIndex !== undefined && pendingUserDbIdRef.current) {
      messageDbIdMapRef.current.set(messages[lastUserIndex].id, pendingUserDbIdRef.current);
      pendingUserDbIdRef.current = null;
    }
    if (last?.role === "assistant" && pendingAssistantDbIdRef.current) {
      messageDbIdMapRef.current.set(last.id, pendingAssistantDbIdRef.current);
      pendingAssistantDbIdRef.current = null;
    }
  }, [messages]);

  const getDbMessageId = useCallback((clientMessageId: string): string | undefined => {
    return messageDbIdMapRef.current.get(clientMessageId);
  }, []);

  const resolvedConversationId =
    routeConversationId && isUUID(routeConversationId)
      ? routeConversationId
      : (conversationIdState ??
        (conversationIdRef.current && isUUID(conversationIdRef.current)
          ? conversationIdRef.current
          : undefined));

  const effectiveStatus = statusOverride ?? status;

  const stopWithFinalize = useCallback(() => {
    const conversationId = conversationIdRef.current;
    const targetAssistantId = [...messagesRef.current]
      .reverse()
      .find((m) => m.role === "assistant")?.id;
    const token =
      conversationId && targetAssistantId ? `${conversationId}:${targetAssistantId}` : undefined;

    stop();

    scheduleTimeout(() => {
      finalizeConversationSideEffects(token);
      void hydrateLastAssistantUsageFromServer();
    }, STOP_FINALIZE_DELAY_MS);
  }, [
    stop,
    scheduleTimeout,
    finalizeConversationSideEffects,
    hydrateLastAssistantUsageFromServer,
    conversationIdRef,
  ]);

  return {
    conversationId: resolvedConversationId,
    messages,
    status: effectiveStatus,
    streamingMessageId,
    setMessages: setChatMessages,
    send,
    stop: stopWithFinalize,
    regenerate: handleRegenerate,
    addToolApprovalResponse,
    getDbMessageId,
  };
}
