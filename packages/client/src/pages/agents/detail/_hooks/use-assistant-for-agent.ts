import { speakAgentText, transcribeAgentAudio } from "@buildingai/services/web";
import type { UIMessage } from "ai";
import { startTransition, useCallback, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { validate as isUUID } from "uuid";

import { useFeatureFlags } from "@/components/ask-assistant-ui/hooks/use-feature-flags";
import { useMessageRepository } from "@/components/ask-assistant-ui/hooks/use-message-repository";
import type { RawMessageRecord } from "@/components/ask-assistant-ui/libs/message-repository";
import type {
  AssistantContextValue,
  DisplayMessage,
  Suggestion,
} from "@/components/ask-assistant-ui/types";

import { useAgentChatStream } from "./use-agent-chat-stream";
import { useAgentFeedback } from "./use-agent-feedback";
import { useAgentMessagesPaging } from "./use-agent-messages-paging";

export interface UseAssistantForAgentOptions {
  agentId: string;
  agentName?: string;
  modelFeatures?: string[];
  saveConversation?: boolean;
  isDebug?: boolean;
  loadHistory?: boolean;
  formVariables?: Record<string, string>;
  formFieldsInputs?: Record<string, unknown>;
  suggestions?: Suggestion[];
  thinkingSupported?: boolean;
  voiceConfig?: {
    stt?: { modelId: string; language?: string };
    tts?: { modelId: string; voiceId?: string; speed?: number };
  } | null;
  showConversationContext?: boolean;
  showReference?: boolean;
  assistantAvatar?: string;
  conversationId?: string;
  disableAutoNavigate?: boolean;
  /** Override available upload types for third-party agents (Coze/Dify). */
  supportedUploadTypes?: Array<"image" | "video" | "audio" | "file">;
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

const AGENT_MODEL_ID = "agent";

export type UseAssistantForAgentReturn = AssistantContextValue & {
  clearMessages: (options?: { reinitThread?: boolean }) => void;
  isLoadingHistory: boolean;
  getDbMessageId: (clientMessageId: string) => string | undefined;
};

export function useAssistantForAgent(
  options: UseAssistantForAgentOptions,
): UseAssistantForAgentReturn {
  const {
    agentId,
    agentName = "Agent",
    modelFeatures,
    saveConversation = true,
    isDebug = false,
    formVariables,
    formFieldsInputs,
    suggestions = [],
    thinkingSupported = true,
    voiceConfig = null,
    showConversationContext = true,
    showReference = true,
    assistantAvatar,
    conversationId,
    disableAutoNavigate = false,
    supportedUploadTypes,
  } = options;
  const { uuid: routeConversationId } = useParams<{ uuid?: string }>();
  const normalizedConversationId = useMemo(() => {
    const id = conversationId ?? routeConversationId;
    return id && isUUID(id) ? id : undefined;
  }, [conversationId, routeConversationId]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageDbIdRef = useRef<string | null>(null);
  const pendingParentIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | undefined>(normalizedConversationId);
  const prevNormalizedConversationIdRef = useRef<string | undefined>(normalizedConversationId);
  const pendingClearRef = useRef(false);

  const { feature, setFeatureFlag } = useFeatureFlags(false);

  const {
    conversationId: currentConversationId,
    messages: streamMessages,
    setMessages,
    status,
    streamingMessageId,
    send,
    stop,
    regenerate,
    addToolApprovalResponse,
    getDbMessageId,
  } = useAgentChatStream({
    agentId,
    saveConversation,
    isDebug,
    formVariables,
    formFieldsInputs,
    feature: Object.fromEntries(
      Object.entries(feature).filter(([_, v]) => v !== undefined),
    ) as Record<string, boolean>,
    lastMessageDbIdRef,
    pendingParentIdRef,
    conversationIdRef,
    routeConversationId: normalizedConversationId,
    disableAutoNavigate,
  });

  const { liked, disliked, onLike, onDislike } = useAgentFeedback(
    streamMessages,
    agentId,
    currentConversationId,
  );

  const {
    messages: repositoryMessages,
    displayMessages,
    importIncremental,
    importMessages,
    resetLastSeenIds,
    switchToBranch,
    clear: clearRepository,
    getParentId,
  } = useMessageRepository();

  const parentMapRef = useRef<Map<string, string | null>>(new Map());
  const isFirstLoadRef = useRef(true);
  const editInProgressRef = useRef(false);

  useEffect(() => {
    const prevId = prevNormalizedConversationIdRef.current;
    const next = normalizedConversationId;
    prevNormalizedConversationIdRef.current = next;
    conversationIdRef.current = next;

    const isSwitching = prevId !== undefined && next !== undefined && prevId !== next;
    const isNavigatingAway = prevId !== undefined && next === undefined;

    if (isSwitching || isNavigatingAway) {
      stop();
      setMessages([]);
      lastMessageDbIdRef.current = null;
      pendingParentIdRef.current = null;
      clearRepository();
      pendingClearRef.current = true;
      parentMapRef.current.clear();
      isFirstLoadRef.current = true;
      editInProgressRef.current = false;
    }
  }, [normalizedConversationId, stop, setMessages, clearRepository]);

  const shouldLoadInitial = Boolean(
    normalizedConversationId &&
    (status === "ready" || status === "error") &&
    streamMessages.length === 0 &&
    !editInProgressRef.current,
  );

  const {
    isLoadingMessages: isLoadingHistory,
    isLoadingMoreMessages,
    hasMoreMessages,
    loadMoreMessages,
  } = useAgentMessagesPaging({
    agentId,
    conversationId: normalizedConversationId,
    setMessages,
    lastMessageDbIdRef,
    shouldLoadInitial,
  });

  const models = useMemo(
    () => [
      {
        id: AGENT_MODEL_ID,
        name: agentName,
        chef: "Agent",
        chefSlug: "agent",
        providers: [],
        features: modelFeatures ?? [],
        thinking: thinkingSupported,
      },
    ],
    [agentName, modelFeatures, thinkingSupported],
  );

  useEffect(() => {
    if (streamMessages.length === 0) {
      pendingClearRef.current = false;
      if (!editInProgressRef.current) {
        clearRepository();
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
    for (const record of records) {
      parentMapRef.current.set(record.id, record.parentId ?? null);
    }

    startTransition(() => {
      if (isFirstLoadRef.current && !isEditing) {
        importMessages(records, true);
        isFirstLoadRef.current = false;
      } else {
        importIncremental(records, true);
        isFirstLoadRef.current = false;
      }
    });
  }, [streamMessages, importMessages, importIncremental, clearRepository]);

  const onSend = useCallback(
    (
      content: string,
      files?: Array<{ type: "file"; url: string; mediaType?: string; filename?: string }>,
    ) => {
      const lastAssistant =
        [...repositoryMessages].reverse().find((m) => m.role === "assistant")?.id ?? null;
      queueMicrotask(() => send(content, lastAssistant, files));
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

      const sliced = sliceMessagesUntil(streamMessages, parentId);
      resetLastSeenIds(sliced.map((m) => m.id));
      editInProgressRef.current = true;
      setMessages(sliced);
      queueMicrotask(() => send(newContent, parentId, files));
    },
    [getParentId, streamMessages, setMessages, send, resetLastSeenIds],
  );

  const onSelectModel = useCallback(() => {}, []);
  const onSelectMcpServers = useCallback(() => {}, []);

  const onSpeak = useCallback(
    (text: string, options?: { onReady?: (stop: () => void) => void }) => {
      const tts = voiceConfig?.tts;
      if (!tts?.modelId || !agentId) return;
      return (async () => {
        const blob = await speakAgentText(agentId, text, {
          modelId: tts.modelId,
          voice: tts.voiceId,
          speed: tts.speed,
        });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        const stop = () => {
          audio.pause();
          audio.currentTime = 0;
          URL.revokeObjectURL(url);
        };
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            reject(audio.error);
          };
          audio
            .play()
            .then(() => options?.onReady?.(stop))
            .catch(reject);
        });
      })();
    },
    [agentId, voiceConfig?.tts?.modelId, voiceConfig?.tts?.voiceId, voiceConfig?.tts?.speed],
  );

  const onVoiceAudio = useCallback(
    async (audioBlob: Blob) => {
      if (!agentId) return;
      const result = await transcribeAgentAudio(agentId, audioBlob);
      return result.text;
    },
    [agentId],
  );

  const clearMessages = useCallback(
    async (options?: { reinitThread?: boolean }) => {
      void options;
      stop();
      setMessages([]);
    },
    [stop, setMessages],
  );

  return {
    clearMessages,
    messages: [...repositoryMessages],
    displayMessages: displayMessages as DisplayMessage[],
    currentThreadId: undefined,
    status,
    streamingMessageId,
    isLoading: isLoadingHistory,
    isLoadingMoreMessages,
    hasMoreMessages,
    models,
    selectedModelId: AGENT_MODEL_ID,
    selectedMcpServerIds: [],
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
    onSelectModel,
    onSelectMcpServers,
    onSetFeature: setFeatureFlag,
    onLike,
    onDislike,
    addToolApprovalResponse,
    agentId,
    voiceConfig: voiceConfig ?? null,
    onSpeak: voiceConfig?.tts?.modelId ? onSpeak : undefined,
    onVoiceAudio: voiceConfig?.stt?.modelId ? onVoiceAudio : undefined,
    showConversationContext,
    showReference,
    assistantAvatar,
    historicalSessions: [],
    isLoadingHistory,
    getDbMessageId,
    supportedUploadTypes,
  };
}
