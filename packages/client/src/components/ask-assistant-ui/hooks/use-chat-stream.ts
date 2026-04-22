import { useChat } from "@ai-sdk/react";
import type { MessageRecord } from "@buildingai/services/web";
import { getConversationInfo, getConversationMessages } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatStatus, FileUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { validate as isUUID } from "uuid";

import { getApiBaseUrl } from "@/utils/api";

/** Delay before running post-stop side effects, giving backend time to persist usage. */
const STOP_FINALIZE_DELAY_MS = 350;
/** Interval between usage-hydration retries when the server hasn't persisted usage yet. */
const USAGE_HYDRATE_RETRY_INTERVAL_MS = 1000;
/** Max number of usage-hydration retries before giving up. */
const USAGE_HYDRATE_MAX_ATTEMPTS = 10;
/** Page size when re-fetching messages to recover usage. Only the latest record is needed. */
const USAGE_HYDRATE_PAGE_SIZE = 2;

function getPendingWeatherApprovalIds(messages: UIMessage[]): string[] {
  return messages.flatMap((message) =>
    (message.parts ?? []).flatMap((part) => {
      const toolPart = part as {
        type?: string;
        state?: string;
        approval?: { id?: string; approved?: boolean };
      };
      const approvalId = toolPart.approval?.id;
      if (
        toolPart.type !== "tool-getWeather" ||
        toolPart.state !== "approval-requested" ||
        !approvalId ||
        toolPart.approval?.approved !== undefined
      ) {
        return [];
      }
      return [approvalId];
    }),
  );
}

export interface UseChatStreamOptions {
  modelId: string;
  mcpServerIds?: string[];
  feature?: Record<string, boolean>;
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

export function useChatStream(options: UseChatStreamOptions): UseChatStreamReturn {
  const {
    modelId,
    mcpServerIds = [],
    feature,
    onThreadCreated,
    lastMessageDbIdRef,
    pendingParentIdRef,
    conversationIdRef,
    prevThreadIdRef,
  } = options;

  const { id: currentThreadId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((state) => state.auth.token);
  const queryClient = useQueryClient();

  /**
   * Tracks pending timeouts scheduled by stop/hydration logic so they can be
   * cleared on unmount to avoid setState-after-unmount warnings and leaks.
   */
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  /**
   * Guards against double-finalizing the same turn when both `onFinish` and
   * manual `stop()` fire. Holds an opaque token identifying the finalized turn.
   */
  const finalizedTokenRef = useRef<string | null>(null);

  /**
   * Schedules a timeout whose handle is auto-cleaned after it fires or when
   * the component unmounts via the effect below.
   */
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

  /**
   * Finalizes chat state after the stream ends (either normally or via manual stop).
   * This ensures usage-related UI (tokens/credits) is refreshed even when `onFinish`
   * is not called (e.g. aborted streaming request). The optional `token` is used to
   * de-duplicate calls when both the normal and stop paths race to finalize.
   */
  const finalizeConversationSideEffects = useCallback(
    (token?: string) => {
      if (token) {
        if (finalizedTokenRef.current === token) return;
        finalizedTokenRef.current = token;
      }

      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      const conversationId = conversationIdRef.current;
      if (conversationId) {
        void getConversationInfo(conversationId)
          .then((info) => {
            queryClient.setQueryData(["conversation", conversationId], info);
          })
          .catch((error) => {
            console.warn("Failed to refresh conversation info after stream end", error);
          });
      }

      queryClient.invalidateQueries({ queryKey: ["user", "info"] });
    },
    [queryClient, conversationIdRef],
  );

  const modelIdRef = useRef(modelId);
  useEffect(() => {
    modelIdRef.current = modelId;
  }, [modelId]);

  const mcpServerIdsRef = useRef(mcpServerIds);
  useEffect(() => {
    mcpServerIdsRef.current = mcpServerIds;
  }, [mcpServerIds]);

  const featureRef = useRef<Record<string, boolean> | undefined>(feature);
  useEffect(() => {
    featureRef.current = feature;
  }, [feature]);
  const messagesRef = useRef<UIMessage[]>([]);
  const autoApprovedWeatherApprovalIdsRef = useRef<Set<string>>(new Set());
  const messageDbIdMapRef = useRef<Map<string, string>>(new Map());
  const pendingUserDbIdRef = useRef<string | null>(null);
  const pendingAssistantDbIdRef = useRef<string | null>(null);
  const [statusOverride, setStatusOverride] = useState<ChatStatus | null>(null);

  const mapLatestMessageId = useCallback((role: UIMessage["role"], dbId: string): boolean => {
    const latest = [...messagesRef.current].reverse().find((message) => message.role === role);
    if (!latest) return false;

    messageDbIdMapRef.current.set(latest.id, dbId);
    return true;
  }, []);

  const {
    messages,
    setMessages: setChatMessages,
    sendMessage,
    stop,
    status,
    regenerate,
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
        const currentMcpServerIds = mcpServerIdsRef.current;
        const currentFeature = featureRef.current;

        return {
          modelId: modelIdRef.current,
          conversationId: conversationIdRef.current || undefined,
          parentId,
          ...(currentFeature &&
            Object.keys(currentFeature).length > 0 && { feature: currentFeature }),
          ...(currentMcpServerIds.length > 0 && { mcpServerIds: currentMcpServerIds }),
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
        const isNewConversation = !conversationIdRef.current;
        conversationIdRef.current = newConversationId;

        if (isNewConversation) {
          const targetPath = location.pathname.startsWith("/chat")
            ? `/chat/${newConversationId}`
            : `/c/${newConversationId}`;
          navigate(targetPath, { replace: true });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
        onThreadCreated?.();
      }

      if (
        (data.type === "data-user-message-id" || data.type === "data-assistant-message-id") &&
        data.data
      ) {
        lastMessageDbIdRef.current = data.data as string;
        if (data.type === "data-user-message-id") {
          pendingUserDbIdRef.current = data.data as string;
          if (mapLatestMessageId("user", data.data as string)) {
            pendingUserDbIdRef.current = null;
          }
        } else {
          pendingAssistantDbIdRef.current = data.data as string;
          if (mapLatestMessageId("assistant", data.data as string)) {
            pendingAssistantDbIdRef.current = null;
          }
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
      console.error("Error streaming chat", error);
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
                data: error?.message || "Unknown error",
              },
            ],
          };
        }
        return updated;
      });
    },
  });

  messagesRef.current = messages;

  useEffect(() => {
    if (!addToolApprovalResponse) return;

    for (const approvalId of getPendingWeatherApprovalIds(messages)) {
      if (autoApprovedWeatherApprovalIdsRef.current.has(approvalId)) continue;
      autoApprovedWeatherApprovalIdsRef.current.add(approvalId);
      addToolApprovalResponse({ id: approvalId, approved: true });
    }
  }, [messages, addToolApprovalResponse]);

  /**
   * Hydrates usage (tokens/power) for the last assistant message from the server.
   *
   * When the stream is manually stopped, the SSE `data-usage` (and often the
   * `data-assistant-message-id`) frame never reaches the client because `fetch`
   * is aborted. The backend, however, still persists usage/userConsumedPower
   * in the `onFinish` callback of the UI message stream. We poll that record
   * for a short window and patch it onto the corresponding assistant message
   * so `MessageUsage` can display correct numbers.
   *
   * Correctness notes:
   * - Target message identity (`conversationId` + assistant client id) is
   *   captured on the first invocation and **frozen** across retries to avoid
   *   applying usage to a newer message after the user sends something else.
   * - Backend pagination is ordered by `sequence: DESC`, so the latest record
   *   is always `items[0]`; we intentionally do NOT reverse the list.
   */
  const hydrateLastAssistantUsageFromServer = useCallback(async (): Promise<void> => {
    const conversationId = conversationIdRef.current;
    if (!conversationId) return;

    const lastAssistant = [...messagesRef.current].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    const targetClientId = lastAssistant.id;
    const targetDbId = messageDbIdMapRef.current.get(targetClientId);

    /**
     * Returns true if the captured target is still the last assistant message
     * in the current (same) conversation. Guards against race conditions where
     * the user switches conversation or sends a new message during retry.
     */
    const isStillTargetable = (): boolean => {
      if (conversationIdRef.current !== conversationId) return false;
      return messagesRef.current.some((m) => m.id === targetClientId && m.role === "assistant");
    };

    /**
     * Finds the server record corresponding to the captured assistant message
     * inside a page of messages. Since `items` is ordered by sequence DESC,
     * the fallback (first assistant with usage) is the newest one.
     */
    const findRecord = (items: MessageRecord[]): MessageRecord | undefined => {
      const matched = items.find(
        (r) => (targetDbId != null && r.id === targetDbId) || r.frontendId === targetClientId,
      );
      if (matched) return matched;

      // Fallback: assume the newest assistant (items are sorted by sequence DESC).
      return items.find(
        (r) =>
          r.message?.role === "assistant" &&
          (r.message?.usage != null || r.message?.userConsumedPower != null),
      );
    };

    /**
     * Applies the server-side usage/userConsumedPower to the captured message.
     * Also injects a `data-usage` part so downstream consumers (which read from
     * either `message.metadata.usage` or the part) stay in sync.
     */
    const applyUsage = (record: MessageRecord): void => {
      const usage = record.message?.usage ?? undefined;
      const userConsumedPower = record.message?.userConsumedPower ?? undefined;
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

          const nextParts = (Array.isArray(m.parts) ? m.parts : []).filter(
            (p) => !(p && typeof p === "object" && (p as { type?: string }).type === "data-usage"),
          );
          nextParts.push(usagePart as (typeof nextParts)[number]);

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

      let record: MessageRecord | undefined;
      try {
        const res = await getConversationMessages({
          conversationId,
          page: 1,
          pageSize: USAGE_HYDRATE_PAGE_SIZE,
        });
        record = findRecord(res.items ?? []);
      } catch (error) {
        console.warn("Failed to fetch conversation messages for usage hydration", error);
      }

      if (!isStillTargetable()) return;

      if (record && (record.message?.usage != null || record.message?.userConsumedPower != null)) {
        applyUsage(record);
        return;
      }

      if (attempt + 1 < USAGE_HYDRATE_MAX_ATTEMPTS) {
        await sleep(USAGE_HYDRATE_RETRY_INTERVAL_MS);
      }
    }
  }, [conversationIdRef, setChatMessages, scheduleTimeout]);

  useEffect(() => {
    const prevThreadId = prevThreadIdRef.current;
    const isSwitchingConversation =
      prevThreadId && currentThreadId && prevThreadId !== currentThreadId;
    const isNavigatingToHome = prevThreadId && !currentThreadId;

    if (isSwitchingConversation || isNavigatingToHome) {
      // If currently streaming, stop the request first
      if (status === "streaming") {
        stop();
      }
      // Clear all messages
      setChatMessages([]);
    }

    pendingParentIdRef.current = null;
    lastMessageDbIdRef.current = null;
    conversationIdRef.current = currentThreadId || undefined;
    prevThreadIdRef.current = currentThreadId;
  }, [currentThreadId, setChatMessages, status, stop]);

  useEffect(() => {
    if (messages.length === 0) {
      setStatusOverride(null);
      messageDbIdMapRef.current.clear();
      autoApprovedWeatherApprovalIdsRef.current.clear();
      pendingUserDbIdRef.current = null;
      pendingAssistantDbIdRef.current = null;
    }
  }, [messages.length]);

  useEffect(() => {
    if (messages.length === 0) return;

    const lastUserIndex = [...messages]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find(({ message }) => message.role === "user")?.index;

    if (lastUserIndex !== undefined && pendingUserDbIdRef.current) {
      messageDbIdMapRef.current.set(messages[lastUserIndex].id, pendingUserDbIdRef.current);
      pendingUserDbIdRef.current = null;
    }

    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && pendingAssistantDbIdRef.current) {
      messageDbIdMapRef.current.set(last.id, pendingAssistantDbIdRef.current);
      pendingAssistantDbIdRef.current = null;
    }
  }, [messages]);

  const getDbMessageId = useCallback((clientMessageId: string): string | undefined => {
    return (
      messageDbIdMapRef.current.get(clientMessageId) ??
      (isUUID(clientMessageId) ? clientMessageId : undefined)
    );
  }, []);

  const handleRegenerate = useCallback(
    (messageId: string) => {
      setStatusOverride(null);
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex > 0 && messages[msgIndex - 1].role === "user") {
        pendingParentIdRef.current = messages[msgIndex - 1].id;
      }
      regenerate({ messageId, body: { trigger: "regenerate-message" } });
    },
    [regenerate, messages],
  );

  const send = useCallback(
    (
      content: string,
      parentId?: string | null,
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
    ) => {
      if (status === "submitted" || status === "streaming") return;
      if (!content.trim() && (!files || files.length === 0)) return;
      if (!token) {
        const redirect = `${location.pathname}${location.search}`;
        navigate(`/login?redirect=${encodeURIComponent(redirect)}`, {
          replace: true,
          state: { redirect },
        });
        return;
      }
      setStatusOverride(null);
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
    [sendMessage, status, token, location.pathname, location.search, navigate, lastMessageDbIdRef],
  );

  const streamingMessageId =
    status === "streaming" && messages.length > 0
      ? messages[messages.length - 1]?.id || null
      : null;

  const effectiveStatus = statusOverride ?? status;

  /**
   * Manually stops streaming and still refreshes usage-related data.
   *
   * `stop()` aborts the underlying fetch, which means the AI SDK neither fires
   * `onFinish` nor `onError`. We therefore schedule a short delay (to let the
   * backend finish persisting usage inside its own `onFinish` callback), then
   * refresh side-effects and hydrate the last assistant usage from the API.
   *
   * A `finalize` token derived from the target conversation/message id ensures
   * that if the normal `onFinish` path already ran for this turn, we don't
   * double-invalidate queries.
   */
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
    currentThreadId,
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
