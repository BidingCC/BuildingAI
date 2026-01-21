import type { AiProvider } from "@buildingai/services/web";
import { getLocalStorage, safeJsonParse, safeJsonStringify } from "@buildingai/stores";
import type { UIMessage } from "ai";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { RawMessageRecord } from "../libs/message-repository";
import { convertProvidersToModels } from "../libs/provider-converter";
import type { AssistantContextValue, DisplayMessage, Suggestion } from "../types";
import { useChatStream } from "./use-chat-stream";
import { useFeedback } from "./use-feedback";
import { useMessageRepository } from "./use-message-repository";
import { useMessagesPaging } from "./use-messages-paging";

export interface UseAssistantOptions {
  providers: AiProvider[];
  suggestions?: Suggestion[];
}

function buildMessageRecords(
  messages: UIMessage[],
  existingParentMap?: Map<string, string | null>,
): RawMessageRecord[] {
  const records: RawMessageRecord[] = [];
  let lastAssistantId: string | null = null;
  let lastUserId: string | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const metadataParentId = (msg.metadata as { parentId?: string } | undefined)?.parentId;
    const metadataSequence = (msg.metadata as { sequence?: number } | undefined)?.sequence;
    const sequence = typeof metadataSequence === "number" ? metadataSequence : i;

    if (metadataParentId !== undefined) {
      records.push({ id: msg.id, parentId: metadataParentId || null, sequence, message: msg });
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
  const idx = messages.findIndex((m) => m.id === parentId);
  return idx === -1 ? messages : messages.slice(0, idx + 1);
}

export function useAssistant(options: UseAssistantOptions): AssistantContextValue {
  const { providers, suggestions = [] } = options;

  const models = useMemo(() => {
    return convertProvidersToModels(providers);
  }, [providers]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const STORAGE_KEY = "__selected_model_id__";
  const MCP_SERVERS_STORAGE_KEY = "__selected_mcp_server_ids__";

  const storage = typeof window !== "undefined" ? getLocalStorage() : null;

  const [selectedModelId, setSelectedModelId] = useState(() => {
    return storage?.getItem(STORAGE_KEY) || "";
  });

  const [selectedMcpServerIds, setSelectedMcpServerIds] = useState<string[]>(() => {
    if (!storage) return [];
    const cached = safeJsonParse<string[]>(storage.getItem(MCP_SERVERS_STORAGE_KEY));
    return Array.isArray(cached) ? cached : [];
  });

  useEffect(() => {
    if (models.length === 0) return;

    const isValidModel = models.some((model) => model.id === selectedModelId);
    const modelId = isValidModel ? selectedModelId : models[0].id;

    if (modelId !== selectedModelId) {
      setSelectedModelId(modelId);
      storage?.setItem(STORAGE_KEY, modelId);
    } else if (!selectedModelId) {
      storage?.setItem(STORAGE_KEY, modelId);
    }
  }, [models, selectedModelId, storage]);

  const handleSelectModel = useCallback(
    (modelId: string) => {
      setSelectedModelId(modelId);
      storage?.setItem(STORAGE_KEY, modelId);
    },
    [storage],
  );

  const handleSelectMcpServers = useCallback(
    (ids: string[]) => {
      setSelectedMcpServerIds(ids);
      storage?.setItem(MCP_SERVERS_STORAGE_KEY, safeJsonStringify(ids));
    },
    [storage],
  );

  const {
    messages: repositoryMessages,
    displayMessages,
    importIncremental,
    importMessages,
    switchToBranch,
    clear: clearRepository,
    getParentId,
  } = useMessageRepository();

  const parentMapRef = useRef<Map<string, string | null>>(new Map());
  const isFirstLoadRef = useRef(true);

  const lastMessageDbIdRef = useRef<string | null>(null);
  const pendingParentIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const prevThreadIdRef = useRef<string | undefined>(undefined);

  const {
    currentThreadId,
    messages: streamMessages,
    setMessages,
    status,
    streamingMessageId,
    send,
    stop,
    regenerate,
    addToolApprovalResponse,
  } = useChatStream({
    modelId: selectedModelId,
    mcpServerIds: selectedMcpServerIds,
    lastMessageDbIdRef,
    pendingParentIdRef,
    conversationIdRef,
    prevThreadIdRef,
  });

  const { liked, disliked, onLike, onDislike } = useFeedback(streamMessages, currentThreadId);

  const { isLoadingMessages, isLoadingMoreMessages, hasMoreMessages, loadMoreMessages } =
    useMessagesPaging({
      setMessages,
      lastMessageDbIdRef,
    });

  useEffect(() => {
    if (streamMessages.length === 0) {
      clearRepository();
      parentMapRef.current.clear();
      isFirstLoadRef.current = true;
      return;
    }

    startTransition(() => {
      const records = buildMessageRecords(streamMessages, parentMapRef.current);

      for (const record of records) {
        parentMapRef.current.set(record.id, record.parentId ?? null);
      }

      if (isFirstLoadRef.current) {
        importMessages(records, true);
        isFirstLoadRef.current = false;
      } else {
        importIncremental(records, true);
      }
    });
  }, [streamMessages, importMessages, importIncremental, clearRepository]);

  useEffect(() => {
    const prevThreadId = prevThreadIdRef.current;
    const isSwitchingConversation =
      prevThreadId && currentThreadId && prevThreadId !== currentThreadId;
    const isNavigatingToHome = prevThreadId && !currentThreadId;

    if (isSwitchingConversation || isNavigatingToHome) {
      clearRepository();
    }

    parentMapRef.current.clear();
    isFirstLoadRef.current = true;
    prevThreadIdRef.current = currentThreadId;
  }, [currentThreadId, clearRepository]);

  const onSend = useCallback(
    (
      content: string,
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
    ) => {
      const lastMessage = repositoryMessages[repositoryMessages.length - 1];
      const parentId = lastMessage?.id ?? null;
      queueMicrotask(() => send(content, parentId, files));
    },
    [repositoryMessages, send],
  );

  const onSwitchBranch = useCallback(
    (messageId: string) => switchToBranch(messageId),
    [switchToBranch],
  );

  const onRegenerate = useCallback(
    (messageId: string) => {
      const parentId = getParentId(messageId);
      if (parentId === undefined) return;

      setMessages(sliceMessagesUntil(streamMessages, parentId));
      regenerate(parentId ?? messageId);
    },
    [getParentId, streamMessages, setMessages, regenerate],
  );

  const onEditMessage = useCallback(
    (
      messageId: string,
      newContent: string,
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
    ) => {
      const parentId = getParentId(messageId);
      if (parentId === undefined) return;

      setMessages(sliceMessagesUntil(streamMessages, parentId));
      queueMicrotask(() => send(newContent, parentId, files));
    },
    [getParentId, streamMessages, setMessages, send],
  );

  return {
    messages: [...repositoryMessages],
    displayMessages: displayMessages as DisplayMessage[],
    currentThreadId,
    status,
    streamingMessageId,
    isLoading: isLoadingMessages,
    isLoadingMoreMessages,
    hasMoreMessages,
    models,
    selectedModelId,
    selectedMcpServerIds,
    suggestions,
    liked,
    disliked,
    textareaRef,
    onSend,
    onLoadMoreMessages: loadMoreMessages,
    onStop: stop,
    onRegenerate,
    onEditMessage,
    onSwitchBranch,
    onSelectModel: handleSelectModel,
    onSelectMcpServers: handleSelectMcpServers,
    onLike,
    onDislike,
    addToolApprovalResponse,
  };
}
