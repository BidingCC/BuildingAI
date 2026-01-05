import {
  Conversation as AIConversation,
  ConversationContent as AIConversationContent,
  ConversationScrollButton as AIConversationScrollButton,
} from "@buildingai/ui/components/ai-elements/conversation";
import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { Button } from "@buildingai/ui/components/ui/button";
import { PanelLeftIcon, PanelRightIcon, ShareIcon } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Message } from "./components/message";
import { ModelSelector } from "./components/model-selector";
import { PromptInput } from "./components/prompt-input";
import { Suggestions } from "./components/suggestions";
import { ViewportSlack } from "./components/viewport-slack";
import { useAssistantContext } from "./context";
import type { Message as MessageType } from "./types";

export interface ThreadProps {
  title?: string;
  onShare?: () => void;
  welcomeMessage?: ReactNode | string;
}

export const Thread = memo(function Thread({ title, onShare, welcomeMessage }: ThreadProps) {
  const {
    messages,
    models,
    selectedModelId,
    suggestions,
    status,
    liked,
    disliked,
    sidebarOpen,
    textareaRef,
    onSend,
    onToggleSidebar,
    onSelectModel,
    onLike,
    onDislike,
  } = useAssistantContext();

  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  const conversationPairs = useMemo(() => {
    const pairs: Array<{ userMessage: MessageType; assistantMessage: MessageType }> = [];
    let currentUserMessage: MessageType | null = null;

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
    (message: PromptInputMessage, _event: FormEvent<HTMLFormElement>) => {
      if (message.text?.trim()) {
        onSend(message.text.trim());
      }
    },
    [onSend],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: { id: string; text: string }) => {
      onSend(suggestion.text);
    },
    [onSend],
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <header className="bg-background relative flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Button onClick={onToggleSidebar} size="icon-sm" variant="ghost">
            {sidebarOpen ? (
              <PanelLeftIcon className="size-4" />
            ) : (
              <PanelRightIcon className="size-4" />
            )}
            <span className="sr-only">{sidebarOpen ? "收起侧边栏" : "展开侧边栏"}</span>
          </Button>
          <ModelSelector
            models={models}
            onModelChange={onSelectModel}
            onOpenChange={setModelSelectorOpen}
            open={modelSelectorOpen}
            selectedModelId={selectedModelId}
          />
        </div>

        {title && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <h1 className="text-base font-semibold">{title}</h1>
          </div>
        )}

        {onShare && (
          <Button onClick={onShare} size="icon-sm" variant="ghost">
            <ShareIcon className="size-4" />
            <span className="sr-only">分享</span>
          </Button>
        )}
      </header>

      <AIConversation className="chat-scroll flex-1">
        <AIConversationContent className="flex min-h-full flex-col gap-4 pb-0">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">
            {hasMessages ? (
              conversationPairs.map((pair, index) => {
                const isLastPair = index === conversationPairs.length - 1;
                const userKey = pair.userMessage.key;
                const assistantKey = pair.assistantMessage.key;
                return (
                  <ViewportSlack
                    key={`${userKey}-${assistantKey}`}
                    isLast={isLastPair}
                    getViewportHeight={getViewportHeight}
                    getBottomAreaHeight={getBottomAreaHeight}
                  >
                    <div className="flex flex-col gap-4">
                      <Message
                        message={pair.userMessage}
                        liked={liked[userKey]}
                        disliked={disliked[userKey]}
                        onLikeChange={(v) => onLike(userKey, v)}
                        onDislikeChange={(v) => onDislike(userKey, v)}
                      />
                      <Message
                        message={pair.assistantMessage}
                        liked={liked[assistantKey]}
                        disliked={disliked[assistantKey]}
                        onLikeChange={(v) => onLike(assistantKey, v)}
                        onDislikeChange={(v) => onDislike(assistantKey, v)}
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

          <div ref={bottomAreaRef} className="sticky bottom-0 z-10">
            <AIConversationScrollButton className="top-[-40px] z-20" />
            <div className="bg-background mx-auto w-full max-w-3xl rounded-t-lg">
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
});
