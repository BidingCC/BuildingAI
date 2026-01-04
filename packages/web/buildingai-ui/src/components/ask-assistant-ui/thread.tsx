import {
  Conversation as AIConversation,
  ConversationContent as AIConversationContent,
  ConversationScrollButton as AIConversationScrollButton,
} from "@buildingai/ui/components/ai-elements/conversation";
import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { Button } from "@buildingai/ui/components/ui/button";
import { PanelLeftIcon, PanelRightIcon, ShareIcon } from "lucide-react";
import type { FormEvent } from "react";
import type React from "react";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { MessageData } from "./components/message";
import { Message } from "./components/message";
import { ModelSelector } from "./components/model-selector";
import { PromptInput } from "./components/prompt-input";
import type { SuggestionData } from "./components/suggestions";
import { Suggestions } from "./components/suggestions";
import { ViewportSlack } from "./components/viewport-slack";
import { AskAssistantContext } from "./context";

export interface ThreadProps {
  title?: string;
  onShare?: () => void;
  welcomeMessage?: React.ReactNode | string;
}

export const Thread = ({ title, onShare, welcomeMessage }: ThreadProps) => {
  const context = useContext(AskAssistantContext);

  if (!context) {
    throw new Error("Thread must be used within AskAssistantProvider");
  }

  const {
    messages,
    models,
    selectedModelId,
    suggestions,
    setSelectedModelId,
    onSubmit,
    onSuggestionClick,
    onLikeChange,
    onDislikeChange,
    onRetry,
    onCopy,
    modelSelectorOpen,
    setModelSelectorOpen,
    status,
    setStatus,
    textareaRef,
    liked,
    setLiked,
    disliked,
    setDisliked,
    sidebarOpen,
    setSidebarOpen,
    addUserMessage,
  } = context;

  const conversationPairs = useMemo(() => {
    const pairs: Array<{ userMessage: MessageData; assistantMessage: MessageData }> = [];
    let currentUserMessage: MessageData | null = null;

    for (const message of messages) {
      if (message.from === "user") {
        currentUserMessage = message;
      } else if (message.from === "assistant" && currentUserMessage) {
        pairs.push({
          userMessage: currentUserMessage,
          assistantMessage: message,
        });
        currentUserMessage = null;
      }
    }

    return pairs;
  }, [messages]);

  const hasMessages = conversationPairs.length > 0;

  const bottomAreaRef = useRef<HTMLDivElement>(null);
  const [bottomAreaHeight, setBottomAreaHeight] = useState(0);

  useEffect(() => {
    if (!bottomAreaRef.current) {
      setBottomAreaHeight(0);
      return;
    }

    let rafId: number;
    let timeoutId: ReturnType<typeof setTimeout>;
    let lastHeight = 0;

    const updateHeight = (newHeight: number) => {
      if (Math.abs(newHeight - lastHeight) > 2) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          rafId = requestAnimationFrame(() => {
            setBottomAreaHeight(newHeight);
            lastHeight = newHeight;
          });
        }, 100);
      }
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(bottomAreaRef.current);
    const initialHeight = bottomAreaRef.current.getBoundingClientRect().height;
    lastHeight = initialHeight;
    setBottomAreaHeight(initialHeight);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const getViewportHeight = useCallback(() => window.innerHeight, []);
  const getBottomAreaHeight = useCallback(() => bottomAreaHeight, [bottomAreaHeight]);

  const handleSubmit = useCallback(
    (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
      onSubmit?.(message, event);
    },
    [onSubmit],
  );

  const handleLikeChange = useCallback(
    (messageKey: string, liked: boolean) => {
      setLiked((prev) => ({
        ...prev,
        [messageKey]: liked,
      }));
      onLikeChange?.(messageKey, liked);
    },
    [setLiked, onLikeChange],
  );

  const handleDislikeChange = useCallback(
    (messageKey: string, disliked: boolean) => {
      setDisliked((prev) => ({
        ...prev,
        [messageKey]: disliked,
      }));
      onDislikeChange?.(messageKey, disliked);
    },
    [setDisliked, onDislikeChange],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: SuggestionData) => {
      if (addUserMessage) {
        setStatus("submitted");
        addUserMessage(suggestion.text);
      } else if (textareaRef?.current) {
        textareaRef.current.value = suggestion.text;
        textareaRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      }
      onSuggestionClick?.(suggestion);
    },
    [addUserMessage, setStatus, textareaRef, onSuggestionClick],
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-x-hidden">
      {/* Top bar with sidebar toggle, title, and share button */}
      <div className="bg-background relative flex items-center justify-between px-4 py-2">
        {/* Left: Sidebar toggle and model selector */}
        <div className="flex items-center gap-2">
          {setSidebarOpen && (
            <Button onClick={() => setSidebarOpen(!sidebarOpen)} size="icon-sm" variant="ghost">
              {sidebarOpen ? (
                <PanelLeftIcon className="size-4" />
              ) : (
                <PanelRightIcon className="size-4" />
              )}
              <span className="sr-only">{sidebarOpen ? "收起侧边栏" : "展开侧边栏"}</span>
            </Button>
          )}
          <ModelSelector
            models={models}
            onModelChange={setSelectedModelId}
            onOpenChange={setModelSelectorOpen}
            open={modelSelectorOpen}
            selectedModelId={selectedModelId}
          />
        </div>

        {/* Center: Title */}
        {title && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <h1 className="text-base font-semibold">{title}</h1>
          </div>
        )}

        {/* Right: Share button */}
        {onShare && (
          <Button onClick={onShare} size="icon-sm" variant="ghost">
            <ShareIcon className="size-4" />
            <span className="sr-only">分享</span>
          </Button>
        )}
      </div>

      <AIConversation className="chat-scroll flex-1">
        <AIConversationContent className="flex min-h-full flex-col gap-4 pb-0">
          {/* Conversation messages */}
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">
            {hasMessages ? (
              conversationPairs.map((pair, index) => {
                const isLastPair = index === conversationPairs.length - 1;
                const userMessageKey = pair.userMessage.key;
                const assistantMessageKey = pair.assistantMessage.key;
                return (
                  <ViewportSlack
                    key={`${userMessageKey}-${assistantMessageKey}`}
                    isLast={isLastPair}
                    getViewportHeight={getViewportHeight}
                    getBottomAreaHeight={getBottomAreaHeight}
                  >
                    <div className="flex flex-col gap-4">
                      <Message
                        message={pair.userMessage}
                        liked={liked[userMessageKey]}
                        disliked={disliked[userMessageKey]}
                        onLikeChange={(liked) => handleLikeChange(userMessageKey, liked)}
                        onDislikeChange={(disliked) =>
                          handleDislikeChange(userMessageKey, disliked)
                        }
                        onRetry={() => onRetry?.(userMessageKey)}
                        onCopy={(content) => onCopy?.(userMessageKey, content)}
                      />
                      <Message
                        message={pair.assistantMessage}
                        liked={liked[assistantMessageKey]}
                        disliked={disliked[assistantMessageKey]}
                        onLikeChange={(liked) => handleLikeChange(assistantMessageKey, liked)}
                        onDislikeChange={(disliked) =>
                          handleDislikeChange(assistantMessageKey, disliked)
                        }
                        onRetry={() => onRetry?.(assistantMessageKey)}
                        onCopy={(content) => onCopy?.(assistantMessageKey, content)}
                      />
                    </div>
                  </ViewportSlack>
                );
              })
            ) : (
              <div className="flex flex-1 items-center justify-center py-4">
                {welcomeMessage || (
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold">欢迎使用 AI 助手</h2>
                    <p className="text-muted-foreground mt-2">开始对话，或者选择一个推荐问题</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom fixed area - inside scroll container for full-width scrollbar */}
          <div ref={bottomAreaRef} className="sticky bottom-0 z-10">
            <AIConversationScrollButton className="top-[-40px] z-20" />
            <div className="bg-background mx-auto w-full max-w-3xl rounded-t-lg">
              {/* Show suggestions when there are no messages */}
              {!hasMessages && suggestions.length > 0 && (
                <Suggestions suggestions={suggestions} onSuggestionClick={handleSuggestionClick} />
              )}
              <PromptInput
                textareaRef={textareaRef}
                status={status}
                onSubmit={handleSubmit}
                globalDrop
                multiple
              />
            </div>
            <div className="text-muted-foreground bg-background py-1.5 text-center text-xs">
              内容由 AI 生成，请仔细甄别
            </div>
          </div>
        </AIConversationContent>
      </AIConversation>
    </div>
  );
};
