import type { UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AssistantContextValue, DisplayMessage, Model, Suggestion } from "./types";
import { useChatStream } from "./use-chat";
import type { RawMessageRecord } from "./utils/message-repository";
import { useMessageRepository } from "./utils/use-message-repository";

export interface UseAssistantOptions {
  models: Model[];
  defaultModelId?: string;
  suggestions?: Suggestion[];
}

/**
 * 将流式消息转换为仓库格式
 * 流式消息是按顺序排列的，需要构建正确的父子关系
 */
function buildMessageRecords(
  messages: UIMessage[],
  existingParentMap?: Map<string, string | null>,
): RawMessageRecord[] {
  const records: RawMessageRecord[] = [];
  let lastAssistantId: string | null = null;
  let lastUserId: string | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // 1. 首先从 metadata 中读取 parentId（API 返回的消息）
    const metadataParentId = (msg.metadata as { parentId?: string } | undefined)?.parentId;

    // 2. 如果 metadata 中有 parentId，使用它
    if (metadataParentId !== undefined) {
      records.push({
        id: msg.id,
        parentId: metadataParentId || null,
        sequence: i,
        message: msg,
      });

      if (msg.role === "user") {
        lastUserId = msg.id;
      } else if (msg.role === "assistant") {
        lastAssistantId = msg.id;
      }
      continue;
    }

    // 3. 如果已有父子关系映射，使用它
    if (existingParentMap?.has(msg.id)) {
      records.push({
        id: msg.id,
        parentId: existingParentMap.get(msg.id),
        sequence: i,
        message: msg,
      });

      if (msg.role === "user") {
        lastUserId = msg.id;
      } else if (msg.role === "assistant") {
        lastAssistantId = msg.id;
      }
      continue;
    }

    // 4. 最后，根据角色计算父消息（流式消息）
    let parentId: string | null = null;

    if (msg.role === "user") {
      // 用户消息的父消息是上一条 assistant 消息
      parentId = lastAssistantId;
      lastUserId = msg.id;
    } else if (msg.role === "assistant") {
      // assistant 消息的父消息是上一条用户消息
      parentId = lastUserId;
      lastAssistantId = msg.id;
    }

    records.push({
      id: msg.id,
      parentId,
      sequence: i,
      message: msg,
    });
  }

  return records;
}

/**
 * 截断消息到指定父消息位置（不含后续消息）
 * 重写时只保留到 user 消息，不保留旧的 assistant 版本
 */
function sliceMessagesUntil(messages: UIMessage[], parentId: string | null): UIMessage[] {
  if (parentId === null) return [];

  const messageIdx = messages.findIndex((m) => m.id === parentId);
  if (messageIdx === -1) {
    console.warn("sliceMessagesUntil: 消息未找到", parentId);
    return messages;
  }

  // 截断到 parentId 位置（包含 parentId 对应的消息）
  return messages.slice(0, messageIdx + 1);
}

export function useAssistant(options: UseAssistantOptions): AssistantContextValue {
  const { models, defaultModelId, suggestions = [] } = options;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [selectedModelId, setSelectedModelId] = useState(defaultModelId || models[0]?.id || "");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [disliked, setDisliked] = useState<Record<string, boolean>>({});

  // 消息仓库
  const {
    messages: repositoryMessages,
    displayMessages,
    importIncremental,
    importMessages,
    switchToBranch,
    clear: clearRepository,
    getParentId,
  } = useMessageRepository();

  // 保存从API加载的消息的父子关系映射
  const parentMapRef = useRef<Map<string, string | null>>(new Map());

  // 是否是首次加载（用于区分全量导入和增量更新）
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

  /**
   * 普通发送逻辑（支持在任意版本分支上继续对话）
   *
   * 关键点：在调用 send 之前，把 useChat 的 messages 截断到当前仓库活跃分支，
   * 这样后续 user 消息的父级就是当前选择的 assistant 版本（1/2 或 2/2）。
   */
  const onSend = useCallback(
    (content: string) => {
      const branchMessages = [...repositoryMessages];
      setMessages(branchMessages);

      // 避免 setMessages 尚未生效导致 send 仍基于旧 messages
      queueMicrotask(() => {
        send(content);
      });
    },
    [repositoryMessages, setMessages, send],
  );

  // 当流式消息变化时，同步到仓库
  useEffect(() => {
    if (streamMessages.length === 0) {
      clearRepository();
      parentMapRef.current.clear();
      isFirstLoadRef.current = true;
      return;
    }

    // 构建消息记录
    const records = buildMessageRecords(streamMessages, parentMapRef.current);

    // 更新父子关系映射
    for (const record of records) {
      parentMapRef.current.set(record.id, record.parentId ?? null);
    }

    // 首次加载使用全量导入，后续使用增量更新
    if (isFirstLoadRef.current) {
      importMessages(records, true);
      isFirstLoadRef.current = false;
    } else {
      // 增量更新，新消息设为活跃分支
      importIncremental(records, true);
    }
  }, [streamMessages, importMessages, importIncremental, clearRepository]);

  // 当切换会话时，重置状态
  useEffect(() => {
    parentMapRef.current.clear();
    isFirstLoadRef.current = true;
  }, [currentThreadId]);

  const onLike = useCallback((messageKey: string, value: boolean) => {
    setLiked((prev) => ({ ...prev, [messageKey]: value }));
  }, []);

  const onDislike = useCallback((messageKey: string, value: boolean) => {
    setDisliked((prev) => ({ ...prev, [messageKey]: value }));
  }, []);

  const onSwitchBranch = useCallback(
    (messageId: string) => {
      switchToBranch(messageId);
    },
    [switchToBranch],
  );

  const onRegenerate = useCallback(
    (messageId: string) => {
      const parentId = getParentId(messageId);

      if (parentId === undefined) {
        console.warn("onRegenerate: 消息不存在", messageId);
        return;
      }

      setMessages(sliceMessagesUntil(streamMessages, parentId));

      regenerate(parentId ?? messageId);
    },
    [getParentId, streamMessages, setMessages, regenerate],
  );

  // 将仓库消息转换为 UIMessage 数组
  const messages = useMemo(() => [...repositoryMessages], [repositoryMessages]);

  return {
    messages,
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
