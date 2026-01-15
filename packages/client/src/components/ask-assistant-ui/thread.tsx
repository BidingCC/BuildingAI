import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { ChatList, ChatListScrollButton } from "@buildingai/ui/components/chat-list";
import { Button } from "@buildingai/ui/components/ui/button";
import { SidebarTrigger } from "@buildingai/ui/components/ui/sidebar";
import { cn } from "@buildingai/ui/lib/utils";
import { ShareIcon } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { memo, useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { MessageItem } from "./components/message-item";
import { ModelSelector } from "./components/model-selector";
import { PromptInput } from "./components/prompt-input";
import { Suggestions } from "./components/suggestions";
import { useAssistantContext } from "./context";

export interface ThreadProps {
  title?: string;
  onShare?: () => void;
  welcomeMessage?: ReactNode | string;
}

const ThreadHeader = memo(function ThreadHeader({
  title,
  models,
  selectedModelId,
  onSelectModel,
  onShare,
}: {
  title?: string;
  models: { id: string; name: string; chef: string; chefSlug: string; providers: string[] }[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  onShare?: () => void;
}) {
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  return (
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
  );
});

const WelcomeMessage = memo(function WelcomeMessage({
  children,
}: {
  children?: ReactNode | string;
}) {
  return (
    <div className="flex flex-1 items-center justify-center py-4">
      {children || (
        <div className="text-center">
          <h2 className="text-2xl font-semibold">欢迎使用 AI 助手</h2>
          <p className="text-muted-foreground mt-2">开始对话，或者选择一个推荐问题</p>
        </div>
      )}
    </div>
  );
});

const LoadingIndicator = memo(function LoadingIndicator() {
  return (
    <div className="flex flex-1 items-center justify-center py-4">
      <div className="text-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
});

const MessageList = memo(function MessageList() {
  const {
    displayMessages,
    streamingMessageId,
    error,
    liked,
    disliked,
    onLike,
    onDislike,
    onRegenerate,
    onSwitchBranch,
    addToolApprovalResponse,
  } = useAssistantContext();

  const lastAssistantId =
    displayMessages.filter((msg) => msg.message.role === "assistant").pop()?.id || null;

  return (
    <>
      {displayMessages.map((displayMsg) => (
        <MessageItem
          key={displayMsg.id}
          displayMessage={displayMsg}
          isStreaming={streamingMessageId === displayMsg.id}
          error={error && displayMsg.id === lastAssistantId ? error.message : undefined}
          liked={liked[displayMsg.id]}
          disliked={disliked[displayMsg.id]}
          onLike={onLike}
          onDislike={onDislike}
          onRegenerate={onRegenerate}
          onSwitchBranch={onSwitchBranch}
          addToolApprovalResponse={addToolApprovalResponse}
        />
      ))}
    </>
  );
});

const InputArea = memo(function InputArea({ hasMessages }: { hasMessages: boolean }) {
  const { suggestions, status, textareaRef, isLoading, onSend, onStop } = useAssistantContext();

  const handleSubmit = useCallback(
    (message: PromptInputMessage, _event: FormEvent<HTMLFormElement>) => {
      const text = message.text?.trim();
      if (text) onSend(text);
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
    <div className="sticky bottom-13 z-10">
      <ChatListScrollButton className="-top-12 z-20" />
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
  );
});

export const Thread = memo(function Thread({ title, onShare, welcomeMessage }: ThreadProps) {
  const {
    displayMessages,
    models,
    selectedModelId,
    isLoading,
    onSelectModel,
    isLoadingMoreMessages,
    hasMoreMessages,
    onLoadMoreMessages,
  } = useAssistantContext();
  const { id } = useParams<{ id: string }>();

  const [smooth, setSmooth] = useState(false);
  const hasMessages = displayMessages.length > 0;

  useEffect(() => {
    if ((hasMessages && !isLoading) || !id) {
      const timer = setTimeout(() => setSmooth(true), 150);
      return () => clearTimeout(timer);
    }
  }, [isLoading, hasMessages, id]);

  const renderContent = () => {
    if (id && !hasMessages && isLoading) {
      return <LoadingIndicator />;
    }

    if (hasMessages) {
      return <MessageList />;
    }

    if (!id) {
      return <WelcomeMessage>{welcomeMessage}</WelcomeMessage>;
    }

    return null;
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <ThreadHeader
        title={title}
        models={models}
        selectedModelId={selectedModelId}
        onSelectModel={onSelectModel}
        onShare={onShare}
      />

      <ChatList
        className={cn(
          "chat-scroll will-change-opacity flex-1",
          "contain-[layout_style_paint]",
          "transition-opacity duration-200 ease-out",
          smooth ? "opacity-100" : "opacity-0",
        )}
        prependKey={displayMessages[0]?.id ?? null}
        hasMore={hasMoreMessages}
        isLoadingMore={isLoadingMoreMessages}
        onLoadMore={id ? onLoadMoreMessages : undefined}
        debug={import.meta.env.DEV}
        hideScrollToBottomButton
      >
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 pb-10">
          {renderContent()}
        </div>
        <InputArea hasMessages={hasMessages} />
      </ChatList>
    </div>
  );
});
