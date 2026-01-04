import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useMemo, useRef, useState } from "react";

import type { MessageData } from "./components/message";
import type { ModelData } from "./components/model-selector";
import type { SuggestionData } from "./components/suggestions";
import { AskAssistantContext } from "./context";
import type { ThreadItem } from "./threadlist-sidebar";

/**
 * Ask Assistant context value
 */
export interface AskAssistantContextValue {
  // Messages
  messages: MessageData[];
  setMessages: (messages: MessageData[]) => void;
  addMessage: (message: MessageData) => void;

  // Models
  models: ModelData[];
  selectedModelId: string;
  setSelectedModelId: (modelId: string) => void;

  // Threads
  threads: ThreadItem[];
  setThreads: (threads: ThreadItem[]) => void;
  selectedThreadId?: string;
  setSelectedThreadId: (threadId: string | undefined) => void;
  createThread: () => void;
  deleteThread: (threadId: string) => void;

  // Suggestions
  suggestions: SuggestionData[];
  setSuggestions: (suggestions: SuggestionData[]) => void;

  // Callbacks
  onSubmit?: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
  onSuggestionClick?: (suggestion: SuggestionData) => void;
  onLikeChange?: (messageKey: string, liked: boolean) => void;
  onDislikeChange?: (messageKey: string, disliked: boolean) => void;
  onRetry?: (messageKey: string) => void;
  onCopy?: (messageKey: string, content: string) => void;

  // Internal state
  liked: Record<string, boolean>;
  setLiked: (
    liked: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ) => void;
  disliked: Record<string, boolean>;
  setDisliked: (
    disliked:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ) => void;
  status: "submitted" | "streaming" | "ready" | "error";
  setStatus: (status: "submitted" | "streaming" | "ready" | "error") => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  modelSelectorOpen: boolean;
  setModelSelectorOpen: (open: boolean) => void;
  streamingMessageId: string | null;
  setStreamingMessageId: (id: string | null) => void;
  streamResponse: (messageId: string, content: string) => Promise<void>;
  addUserMessage: (content: string) => void;
  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

/**
 * Ask Assistant Provider props
 */
export interface AskAssistantProviderProps {
  /** Initial messages */
  initialMessages?: MessageData[];
  /** Initial models */
  models: ModelData[];
  /** Initial selected model ID */
  initialSelectedModelId?: string;
  /** Initial threads */
  initialThreads?: ThreadItem[];
  /** Initial selected thread ID */
  initialSelectedThreadId?: string;
  /** Initial suggestions */
  initialSuggestions?: SuggestionData[];
  /** Callback when message is submitted */
  onSubmit?: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
  /** Callback when a suggestion is clicked */
  onSuggestionClick?: (suggestion: SuggestionData) => void;
  /** Callback when message like status changes */
  onLikeChange?: (messageKey: string, liked: boolean) => void;
  /** Callback when message dislike status changes */
  onDislikeChange?: (messageKey: string, disliked: boolean) => void;
  /** Callback when retry is triggered */
  onRetry?: (messageKey: string) => void;
  onCopy?: (messageKey: string, content: string) => void;
  children: ReactNode;
}

export function AskAssistantProvider({
  initialMessages = [],
  models,
  initialSelectedModelId,
  initialThreads = [],
  initialSelectedThreadId,
  initialSuggestions = [],
  onSubmit,
  onSuggestionClick,
  onLikeChange,
  onDislikeChange,
  onRetry,
  onCopy,
  children,
}: AskAssistantProviderProps) {
  const [messages, setMessages] = useState<MessageData[]>(initialMessages);
  const [selectedModelId, setSelectedModelId] = useState<string>(
    initialSelectedModelId || models[0]?.id || "",
  );
  const [threads, setThreads] = useState<ThreadItem[]>(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(
    initialSelectedThreadId,
  );
  const [suggestions, setSuggestions] = useState<SuggestionData[]>(initialSuggestions);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [disliked, setDisliked] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"submitted" | "streaming" | "ready" | "error">("ready");
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addMessage = useCallback((message: MessageData) => {
    setMessages((prev) => [...prev, message]);
  }, []);
  const streamResponse = useCallback(async (messageId: string, content: string) => {
    setStatus("streaming");
    setStreamingMessageId(messageId);

    const words = content.split(" ");
    let currentContent = "";

    for (let i = 0; i < words.length; i++) {
      currentContent += (i > 0 ? " " : "") + words[i];

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.versions?.some((v) => v.id === messageId)) {
            return {
              ...msg,
              versions: msg.versions?.map((v) =>
                v.id === messageId ? { ...v, content: currentContent } : v,
              ),
            };
          }
          if (msg.key === messageId) {
            return {
              ...msg,
              content: currentContent,
            };
          }
          return msg;
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, Math.random() * 100 + 50));
    }

    setStatus("ready");
    setStreamingMessageId(null);
  }, []);

  const addUserMessage = useCallback(
    (content: string) => {
      const userMessage: MessageData = {
        key: `user-${Date.now()}`,
        from: "user",
        versions: [
          {
            id: `user-${Date.now()}`,
            content,
          },
        ],
      };

      setMessages((prev) => [...prev, userMessage]);

      requestAnimationFrame(() => {
        const assistantMessageId = `assistant-${Date.now()}`;
        const assistantMessage: MessageData = {
          key: `assistant-${Date.now()}`,
          from: "assistant",
          versions: [
            {
              id: assistantMessageId,
              content: "",
            },
          ],
        };

        setMessages((prev) => [...prev, assistantMessage]);

        const mockResponses = [
          "That's a great question! Let me help you understand this concept better. The key thing to remember is that proper implementation requires careful consideration of the underlying principles and best practices in the field.",
          "I'd be happy to explain this topic in detail. From my understanding, there are several important factors to consider when approaching this problem. Let me break it down step by step for you.",
          "This is an interesting topic that comes up frequently. The solution typically involves understanding the core concepts and applying them in the right context. Here's what I recommend...",
          "Great choice of topic! This is something that many developers encounter. The approach I'd suggest is to start with the fundamentals and then build up to more complex scenarios.",
          "That's definitely worth exploring. From what I can see, the best way to handle this is to consider both the theoretical aspects and practical implementation details.",
        ];

        const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];

        streamResponse(assistantMessageId, randomResponse);
      });
    },
    [streamResponse],
  );

  const createThread = useCallback(() => {
    const newThread: ThreadItem = {
      id: `thread-${Date.now()}`,
      title: "New Chat",
      updatedAt: new Date(),
      createdAt: new Date(),
    };
    setThreads((prev) => [newThread, ...prev]);
    setSelectedThreadId(newThread.id);
    setMessages([]);
  }, []);

  const deleteThread = useCallback(
    (threadId: string) => {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (selectedThreadId === threadId) {
        setSelectedThreadId(undefined);
        setMessages([]);
      }
    },
    [selectedThreadId],
  );

  /**
   * Internal submit handler that integrates with the conversation flow
   */
  const handleInternalSubmit = useCallback(
    async (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      setStatus("submitted");

      // Clear textarea immediately for better UX
      if (textareaRef.current) {
        textareaRef.current.value = "";
      }

      // Add user message immediately for instant feedback
      const messageText = message.text || (hasAttachments ? "Sent with attachments" : "");
      if (messageText) {
        addUserMessage(messageText);
      }

      // Call external onSubmit asynchronously (don't block UI)
      if (onSubmit) {
        Promise.resolve(onSubmit(message, event)).catch((error) => {
          console.error("Error in onSubmit handler:", error);
        });
      }
    },
    [onSubmit, addUserMessage, textareaRef],
  );

  const value: AskAssistantContextValue = useMemo(
    () => ({
      messages,
      setMessages,
      addMessage,
      models,
      selectedModelId,
      setSelectedModelId,
      threads,
      setThreads,
      selectedThreadId,
      setSelectedThreadId,
      createThread,
      deleteThread,
      suggestions,
      setSuggestions,
      onSubmit: handleInternalSubmit,
      onSuggestionClick,
      onLikeChange,
      onDislikeChange,
      onRetry,
      onCopy,
      liked,
      setLiked,
      disliked,
      setDisliked,
      status,
      setStatus,
      textareaRef,
      modelSelectorOpen,
      setModelSelectorOpen,
      streamingMessageId,
      setStreamingMessageId,
      streamResponse,
      addUserMessage,
      sidebarOpen,
      setSidebarOpen,
    }),
    [
      messages,
      addMessage,
      models,
      selectedModelId,
      threads,
      selectedThreadId,
      createThread,
      deleteThread,
      suggestions,
      handleInternalSubmit,
      onSuggestionClick,
      onLikeChange,
      onDislikeChange,
      onRetry,
      onCopy,
      liked,
      disliked,
      status,
      modelSelectorOpen,
      streamingMessageId,
      streamResponse,
      addUserMessage,
      sidebarOpen,
    ],
  );

  return <AskAssistantContext.Provider value={value}>{children}</AskAssistantContext.Provider>;
}
