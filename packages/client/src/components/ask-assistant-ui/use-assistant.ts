import type { UIMessage } from "ai";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";

import type { AssistantContextValue, DisplayMessage, Model, Suggestion } from "./types";
import { useChatStream } from "./use-chat";
import type { RawMessageRecord } from "./utils/message-repository";
import { useMessageRepository } from "./utils/use-message-repository";

export interface UseAssistantOptions {
  models: Model[];
  defaultModelId?: string;
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

    if (metadataParentId !== undefined) {
      records.push({ id: msg.id, parentId: metadataParentId || null, sequence: i, message: msg });
      if (msg.role === "user") lastUserId = msg.id;
      else if (msg.role === "assistant") lastAssistantId = msg.id;
      continue;
    }

    if (existingParentMap?.has(msg.id)) {
      records.push({
        id: msg.id,
        parentId: existingParentMap.get(msg.id),
        sequence: i,
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

    records.push({ id: msg.id, parentId, sequence: i, message: msg });
  }

  return records;
}

function sliceMessagesUntil(messages: UIMessage[], parentId: string | null): UIMessage[] {
  if (parentId === null) return [];
  const idx = messages.findIndex((m) => m.id === parentId);
  return idx === -1 ? messages : messages.slice(0, idx + 1);
}

export function useAssistant(options: UseAssistantOptions): AssistantContextValue {
  const { models, defaultModelId, suggestions = [] } = options;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedModelId, setSelectedModelId] = useState(defaultModelId || models[0]?.id || "");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [disliked, setDisliked] = useState<Record<string, boolean>>({});

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

  const {
    currentThreadId,
    messages: streamMessages,
    isLoadingMessages,
    status,
    streamingMessageId,
    error,
    setMessages,
    send,
    stop,
    regenerate,
    addToolApprovalResponse,
  } = useChatStream({
    modelId: "5f325ca6-03da-4f7f-8e42-025474e48b44",
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
    parentMapRef.current.clear();
    isFirstLoadRef.current = true;
  }, [currentThreadId]);

  const onSend = useCallback(
    (content: string) => {
      const lastMessage = repositoryMessages[repositoryMessages.length - 1];
      const parentId = lastMessage?.id ?? null;
      queueMicrotask(() => send(content, parentId));
    },
    [repositoryMessages, send],
  );

  const onLike = useCallback((messageKey: string, value: boolean) => {
    setLiked((prev) => ({ ...prev, [messageKey]: value }));
  }, []);

  const onDislike = useCallback((messageKey: string, value: boolean) => {
    setDisliked((prev) => ({ ...prev, [messageKey]: value }));
  }, []);

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

  return {
    messages: [...repositoryMessages],
    displayMessages: displayMessages as DisplayMessage[],
    threads: [],
    currentThreadId,
    status,
    streamingMessageId,
    isLoading: isLoadingMessages,
    error,
    models,
    selectedModelId,
    suggestions,
    liked,
    disliked,
    textareaRef,
    onSend,
    onStop: stop,
    onRegenerate,
    onSwitchBranch,
    onSelectModel: setSelectedModelId,
    onLike,
    onDislike,
    addToolApprovalResponse,
  };
}
