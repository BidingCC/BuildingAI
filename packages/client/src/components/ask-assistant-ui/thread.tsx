import {
  Conversation as AIConversation,
  ConversationContent as AIConversationContent,
  ConversationScrollButton as AIConversationScrollButton,
} from "@buildingai/ui/components/ai-elements/conversation";
import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { Button } from "@buildingai/ui/components/ui/button";
import { SidebarTrigger } from "@buildingai/ui/components/ui/sidebar";
import { ShareIcon } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { Message } from "./components/message";
import { ModelSelector } from "./components/model-selector";
import { PromptInput } from "./components/prompt-input";
import { Suggestions } from "./components/suggestions";
import { ViewportSlack } from "./components/viewport-slack";
import { useAssistantContext } from "./context";

export interface ThreadProps {
  title?: string;
  onShare?: () => void;
  welcomeMessage?: ReactNode | string;
}

export const Thread = memo(function Thread({ title, onShare, welcomeMessage }: ThreadProps) {
  const {
    displayMessages,
    models,
    selectedModelId,
    suggestions,
    status,
    liked,
    isLoading,
    disliked,
    textareaRef,
    streamingMessageId,
    error,
    onSend,
    onStop,
    onSelectModel,
    onLike,
    onDislike,
    onRegenerate,
    onSwitchBranch,
    addToolApprovalResponse,
  } = useAssistantContext();

  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  const hasMessages = displayMessages.length > 0;

  const bottomAreaRef = useRef<HTMLDivElement>(null);
  const [bottomAreaHeight, setBottomAreaHeight] = useState(0);

  const { id } = useParams<{ id: string }>();

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

  const lastAssistantId =
    displayMessages.filter((msg) => msg.message.role === "assistant").pop()?.id || null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <header className="bg-background relative flex flex-row-reverse items-center justify-between px-4 py-2 md:flex-row">
        <div className="flex shrink-0 items-center gap-2">
          <ModelSelector
            models={models}
            onModelChange={onSelectModel}
            onOpenChange={setModelSelectorOpen}
            open={modelSelectorOpen}
            selectedModelId={selectedModelId}
          />
        </div>

        {title && (
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <div className="line-clamp-1 md:absolute md:left-1/2 md:-translate-x-1/2">
              <h1 className="text-base leading-none font-semibold">{title}</h1>
            </div>
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
            {hasMessages || id ? (
              displayMessages.length > 0 ? (
                displayMessages.map((displayMsg) => {
                  const isStreaming = streamingMessageId === displayMsg.id;
                  const hasError = error && displayMsg.id === lastAssistantId;

                  return (
                    <ViewportSlack
                      key={displayMsg.stableKey}
                      isLast={displayMsg.isLast}
                      getViewportHeight={getViewportHeight}
                      getBottomAreaHeight={getBottomAreaHeight}
                    >
                      <div className="flex flex-col gap-4">
                        <Message
                          message={displayMsg.message}
                          liked={liked[displayMsg.id]}
                          disliked={disliked[displayMsg.id]}
                          onLikeChange={(v) => onLike(displayMsg.id, v)}
                          onDislikeChange={(v) => onDislike(displayMsg.id, v)}
                          onRetry={() => onRegenerate(displayMsg.id)}
                          isStreaming={isStreaming}
                          branchNumber={displayMsg.branchNumber}
                          branchCount={displayMsg.branchCount}
                          branches={displayMsg.branches}
                          onSwitchBranch={onSwitchBranch}
                          error={hasError ? error.message : undefined}
                          addToolApprovalResponse={addToolApprovalResponse}
                        />
                      </div>
                    </ViewportSlack>
                  );
                })
              ) : isLoading ? (
                <div className="flex flex-1 items-center justify-center py-4">
                  <div className="text-center">
                    <p className="text-muted-foreground">加载中...</p>
                  </div>
                </div>
              ) : null
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
            <AIConversationScrollButton className="-top-12 z-20" />
            <div className="bg-background mx-auto w-full max-w-3xl rounded-t-lg">
              {!hasMessages && suggestions.length > 0 && !isLoading && (
                <Suggestions suggestions={suggestions} onSuggestionClick={handleSuggestionClick} />
              )}
              <PromptInput
                textareaRef={textareaRef}
                status={status}
                onSubmit={handleSubmit}
                onStop={onStop}
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
