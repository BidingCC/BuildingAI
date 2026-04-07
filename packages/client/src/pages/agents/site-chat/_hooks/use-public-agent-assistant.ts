import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import { useI18n } from "@buildingai/i18n";
import type { FormFieldConfig } from "@buildingai/types/ai/agent-config.interface";
import type { UIMessage } from "ai";
import { startTransition, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { validate as isUUID } from "uuid";

import type {
  AssistantContextValue,
  DisplayMessage,
  RawMessageRecord,
} from "@/components/ask-assistant-ui";
import { useMessageRepository } from "@/components/ask-assistant-ui";

import { hasRenderableOpeningStatement } from "../../detail/_utils/opening-statement.ts";
import { usePublicAgentDetail } from "../services/public-agent-detail";
import { usePublicConversations } from "../services/public-conversations";
import { getPublicApiRequestErrorCode } from "../services/public-http";
import { usePublicAgentChatStream } from "./use-public-agent-chat-stream";
import { usePublicAgentFeedback } from "./use-public-agent-feedback";
import { usePublicAgentMessagesPaging } from "./use-public-agent-messages-paging";

const AGENT_MODEL_ID = "agent";

function buildMessageRecords(
  messages: UIMessage[],
  existingParentMap?: Map<string, string | null>,
): RawMessageRecord[] {
  const records: RawMessageRecord[] = [];
  let lastAssistantId: string | null = null;
  let lastUserId: string | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const metadataParentId = (msg.metadata as { parentId?: string | null } | undefined)?.parentId;
    const metadataSequence = (msg.metadata as { sequence?: number } | undefined)?.sequence;
    const sequence = typeof metadataSequence === "number" ? metadataSequence : i;

    if (metadataParentId !== undefined) {
      records.push({
        id: msg.id,
        parentId: metadataParentId ?? null,
        sequence,
        message: msg,
      });

      if (msg.role === "user") lastUserId = msg.id;
      else if (msg.role === "assistant") lastAssistantId = msg.id;
      continue;
    }

    if (existingParentMap?.has(msg.id)) {
      records.push({
        id: msg.id,
        parentId: existingParentMap.get(msg.id),
        sequence,
        message: msg,
      });

      if (msg.role === "user") lastUserId = msg.id;
      else if (msg.role === "assistant") lastAssistantId = msg.id;
      continue;
    }

    let parentId: string | null = null;
    if (msg.role === "user") {
      parentId = lastAssistantId;
      lastUserId = msg.id;
    } else if (msg.role === "assistant") {
      parentId = lastUserId;
      lastAssistantId = msg.id;
    }

    records.push({ id: msg.id, parentId, sequence, message: msg });
  }

  return records;
}

function sliceMessagesUntil(messages: UIMessage[], parentId: string | null): UIMessage[] {
  if (parentId === null) return [];
  if (!messages.length) return [];
  const idx = messages.findIndex((m) => m.id === parentId);
  return idx === -1 ? messages : messages.slice(0, idx + 1);
}

export function usePublicAgentAssistant(args: {
  agentId: string;
  accessToken: string;
  anonymousIdentifier?: string;
  conversationId?: string;
  formVariables?: Record<string, string> | undefined;
}) {
  const { agentId, accessToken, anonymousIdentifier, conversationId, formVariables } = args;
  const { t } = useI18n();
  const navigate = useNavigate();

  const normalizedConversationId = useMemo(() => {
    if (!conversationId) return undefined;
    return isUUID(conversationId) ? conversationId : undefined;
  }, [conversationId]);

  const { data: agent, isLoading: isAgentLoading } = usePublicAgentDetail(
    agentId,
    accessToken,
    anonymousIdentifier,
  );

  const {
    data: conversations,
    isLoading: isLoadingConversations,
    isError: isConversationsError,
    error: conversationsError,
  } = usePublicConversations(agentId, accessToken, anonymousIdentifier, t("chat.newChat"));

  const conversationsEmbedAccessDisabled =
    isConversationsError &&
    getPublicApiRequestErrorCode(conversationsError) === BusinessCode.UNAUTHORIZED;

  const {
    conversationId: streamConversationId,
    messages: streamMessages,
    setMessages,
    status,
    stop,
    sendWithParent,
    streamingMessageId,
    addToolApprovalResponse,
    regenerate,
    getDbMessageId,
  } = usePublicAgentChatStream({
    agentId,
    accessToken,
    anonymousIdentifier,
    initialConversationId: normalizedConversationId,
    saveConversation: true,
    formVariables,
  });

  const conversationIdForMessageOps = streamConversationId ?? normalizedConversationId;
  const canOperateMessage = Boolean(
    conversationIdForMessageOps && isUUID(conversationIdForMessageOps),
  );

  const parentMapRef = useRef<Map<string, string | null>>(new Map());
  const isFirstLoadRef = useRef(true);
  const prevNormalizedConversationIdRef = useRef<string | undefined>(normalizedConversationId);
  const editInProgressRef = useRef(false);
  const pendingClearRef = useRef(false);

  const handleMessagesLoadError = useCallback(() => {
    navigate(`/agents/${agentId}/${accessToken}`);
  }, [navigate, agentId, accessToken]);

  const { isLoadingMessages, isLoadingMoreMessages, hasMoreMessages, loadMoreMessages } =
    usePublicAgentMessagesPaging({
      agentId,
      accessToken,
      anonymousIdentifier,
      conversationId:
        conversationIdForMessageOps && isUUID(conversationIdForMessageOps)
          ? conversationIdForMessageOps
          : undefined,
      setMessages,
      shouldLoadInitial: Boolean(
        conversationIdForMessageOps &&
        isUUID(conversationIdForMessageOps) &&
        status !== "streaming" &&
        status !== "submitted" &&
        streamMessages.length === 0 &&
        !editInProgressRef.current,
      ),
      onLoadError: handleMessagesLoadError,
    });

  const {
    likedMap,
    dislikedMap,
    onLike: onLikeRaw,
    onDislike: onDislikeRaw,
  } = usePublicAgentFeedback({
    agentId,
    accessToken,
    anonymousIdentifier,
    messages: streamMessages,
    setMessages,
    canOperateMessage,
    conversationIdForMessageOps,
    getDbMessageId,
  });

  const formFields = useMemo(
    () => (Array.isArray(agent?.formFields) ? (agent?.formFields as FormFieldConfig[]) : []),
    [agent?.formFields],
  );

  const requiredFields = useMemo(() => formFields.filter((f) => f.required), [formFields]);

  const chatModelFeatures = useMemo(() => {
    return agent?.models?.find((model) => model.role === "chat")?.features ?? [];
  }, [agent?.models]);

  const models = useMemo(
    () => [
      {
        id: AGENT_MODEL_ID,
        name: agent?.name ?? "Agent",
        chef: "Agent",
        chefSlug: "agent",
        providers: [],
        features: chatModelFeatures,
        thinking: Boolean(agent?.modelConfig),
      },
    ],
    [agent?.name, agent?.modelConfig, chatModelFeatures],
  );

  const assistantAvatar = useMemo(() => {
    if (!agent?.chatAvatarEnabled) return undefined;
    return agent?.chatAvatar?.trim() ? agent?.chatAvatar : (agent?.avatar ?? undefined);
  }, [agent?.chatAvatar, agent?.avatar, agent?.chatAvatarEnabled]);

  const openingStatementValue = agent?.openingStatement;
  const openingQuestions = useMemo(() => {
    const raw = agent?.openingQuestions;
    if (!Array.isArray(raw)) return [];
    return raw.map((q) => String(q).trim()).filter(Boolean);
  }, [agent?.openingQuestions]);
  const hasOpeningContent = useMemo(
    () => hasRenderableOpeningStatement(openingStatementValue),
    [openingStatementValue],
  );
  const hasOpening = hasOpeningContent || openingQuestions.length > 0;

  const {
    clear,
    importMessages,
    importIncremental,
    resetLastSeenIds,
    displayMessages: repoDisplayMessages,
    messages: repoMessages,
    getParentId,
    switchToBranch,
  } = useMessageRepository();

  useEffect(() => {
    const prev = prevNormalizedConversationIdRef.current;
    const next = normalizedConversationId;
    prevNormalizedConversationIdRef.current = next;

    const isSwitching = prev !== undefined && next !== undefined && prev !== next;
    const isNavigatingAway = prev !== undefined && next === undefined;

    if (isSwitching || isNavigatingAway) {
      clear();
      pendingClearRef.current = true;
    }

    parentMapRef.current.clear();
    isFirstLoadRef.current = true;
    editInProgressRef.current = false;
  }, [normalizedConversationId, clear]);

  useEffect(() => {
    if (streamMessages.length === 0) {
      pendingClearRef.current = false;
      if (!editInProgressRef.current) {
        clear();
        parentMapRef.current.clear();
        isFirstLoadRef.current = true;
      }
      return;
    }

    if (pendingClearRef.current) {
      return;
    }

    const isEditing = editInProgressRef.current;
    if (isEditing) editInProgressRef.current = false;

    const records = buildMessageRecords(streamMessages, parentMapRef.current);
    for (const record of records) parentMapRef.current.set(record.id, record.parentId ?? null);

    startTransition(() => {
      if (isFirstLoadRef.current && !isEditing) {
        importMessages(records, true);
        isFirstLoadRef.current = false;
      } else {
        importIncremental(records, true);
      }
    });
  }, [importIncremental, importMessages, streamMessages, clear]);

  const displayMessages: DisplayMessage[] = [...repoDisplayMessages];
  const messages: UIMessage[] = [...repoMessages];

  const hasCurrentMessages = displayMessages.length > 0;
  const isFirstSession = !hasCurrentMessages && !isLoadingMessages;

  const openConversation = (id: string) => {
    navigate(`/agents/${agentId}/${accessToken}/c/${id}`);
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const sliceWithDbAwareParent = useCallback(
    (parentId: string | null) => sliceMessagesUntil(streamMessages, parentId),
    [streamMessages],
  );

  const onEditMessage = useCallback(
    (
      messageId: string,
      newContent: string,
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
    ) => {
      const parentId = getParentId(messageId);
      if (parentId === undefined) return;

      const sliced = sliceWithDbAwareParent(parentId);
      resetLastSeenIds(sliced.map((m) => m.id));
      editInProgressRef.current = true;
      setMessages(sliced);
      queueMicrotask(() => sendWithParent(newContent, parentId, files));
    },
    [getParentId, setMessages, sliceWithDbAwareParent, sendWithParent, resetLastSeenIds],
  );

  const onSwitchBranch = useCallback(
    (messageId: string) => {
      switchToBranch(messageId);
    },
    [switchToBranch],
  );

  const onSend = useCallback(
    (
      content: string,
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
    ) => {
      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.id ?? null;
      queueMicrotask(() => sendWithParent(content, lastAssistant, files));
    },
    [messages, sendWithParent],
  );

  const onRegenerate = useCallback(
    (messageId: string) => {
      const parentId = getParentId(messageId);
      if (parentId === undefined) return;
      setMessages(sliceWithDbAwareParent(parentId));
      regenerate(parentId ?? messageId);
    },
    [getParentId, setMessages, sliceWithDbAwareParent, regenerate],
  );

  const onDislike = useCallback(
    async (messageKey: string, disliked: boolean, dislikeReason?: string, _isUpdate?: boolean) => {
      await onDislikeRaw(messageKey, disliked, dislikeReason);
    },
    [onDislikeRaw],
  );

  const contextValue: AssistantContextValue = {
    agentId,
    messages,
    displayMessages,
    currentThreadId: conversationIdForMessageOps,
    status,
    streamingMessageId,
    isLoading: isLoadingMessages,
    isLoadingMoreMessages,
    hasMoreMessages,
    models,
    selectedModelId: AGENT_MODEL_ID,
    selectedMcpServerIds: [],
    suggestions: [],
    liked: likedMap,
    disliked: dislikedMap,
    textareaRef,
    onSend,
    onLoadMoreMessages: loadMoreMessages,
    onStop: stop,
    onRegenerate,
    onEditMessage,
    onSwitchBranch,
    onSelectModel: () => {},
    onSelectMcpServers: () => {},
    onSetFeature: () => {},
    onLike: onLikeRaw,
    onDislike,
    addToolApprovalResponse,
    onSpeak: undefined,
    onVoiceAudio: undefined,
    showConversationContext: false,
    assistantAvatar,
  };

  return {
    providerValue: contextValue,
    agent,
    isAgentLoading,
    conversations,
    isLoadingConversations,
    conversationsEmbedAccessDisabled,
    formFields,
    requiredFields,
    assistantAvatar,
    openingQuestions,
    openingStatementValue,
    hasOpeningContent,
    hasOpening,
    isFirstSession,
    canOperateMessage,
    openConversation,
  };
}
