import { useCallback, useRef, useState } from "react";

import type { AssistantContextValue, Model, Suggestion } from "./types";
import { useChat } from "./use-chat";
import { useThreads } from "./use-threads";

export interface UseAssistantOptions {
  models: Model[];
  defaultModelId?: string;
  suggestions?: Suggestion[];
}

export function useAssistant(options: UseAssistantOptions): AssistantContextValue {
  const { models, defaultModelId, suggestions = [] } = options;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [selectedModelId, setSelectedModelId] = useState(defaultModelId || models[0]?.id || "");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [disliked, setDisliked] = useState<Record<string, boolean>>({});

  const {
    threads,
    currentThreadId,
    messages,
    isLoadingThreads,
    isLoadingMessages,
    selectThread,
    deleteThread,
    newChat,
    refreshThreads,
    setMessages,
    skipNextLoad,
  } = useThreads();

  const { status, streamingMessageId, send, stop } = useChat({
    currentThreadId,
    messages,
    setMessages,
    onThreadCreated: refreshThreads,
    skipNextLoad,
  });

  const onToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const onLike = useCallback((messageKey: string, value: boolean) => {
    setLiked((prev) => ({ ...prev, [messageKey]: value }));
  }, []);

  const onDislike = useCallback((messageKey: string, value: boolean) => {
    setDisliked((prev) => ({ ...prev, [messageKey]: value }));
  }, []);

  return {
    messages,
    threads,
    currentThreadId,
    status,
    streamingMessageId,
    isLoading: isLoadingMessages || isLoadingThreads,

    models,
    selectedModelId,
    suggestions,

    sidebarOpen,
    liked,
    disliked,

    textareaRef,

    onSend: send,
    onStop: stop,
    onSelectThread: selectThread,
    onDeleteThread: deleteThread,
    onNewChat: newChat,
    onToggleSidebar,
    onSelectModel: setSelectedModelId,
    onLike,
    onDislike,
  };
}
