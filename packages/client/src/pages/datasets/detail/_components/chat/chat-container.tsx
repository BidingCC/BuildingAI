import { InfiniteScrollTop } from "@buildingai/ui/components/infinite-scroll-top";
import { Button } from "@buildingai/ui/components/ui/button";
import { PanelLeftClose, SquarePen } from "lucide-react";
import { useCallback } from "react";

import type { Model } from "@/components/ask-assistant-ui";
import { MessageItem, useAssistantContext } from "@/components/ask-assistant-ui";

import { useChatPanel } from "../../_layouts";
import { ChatHistory } from "./chat-history";
import { ChatInput } from "./chat-input";
import { ChatWelcome } from "./chat-welcome";

export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

export interface WelcomeConfig {
  title: string;
  creator?: string;
  instruction?: string;
}

export interface Suggestion {
  id: string;
  text: string;
}

export const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { id: "1", text: "这个知识库主要包含哪些内容？" },
  { id: "2", text: "请根据知识库内容回答我的问题" },
  { id: "3", text: "总结一下知识库中的关键信息" },
];

export interface ChatContainerProps {
  welcomeConfig?: WelcomeConfig;
  datasetId?: string;
  currentConversationId?: string;
  onSelectConversation?: (conversationId: string | undefined) => void;
}

export function ChatContainer({
  welcomeConfig,
  datasetId,
  currentConversationId,
  onSelectConversation,
}: ChatContainerProps) {
  const { toggleChatPanel } = useChatPanel();
  const {
    displayMessages,
    streamingMessageId,
    liked,
    disliked,
    // onLike,
    // onDislike,
    onRegenerate,
    onEditMessage,
    onSwitchBranch,
    addToolApprovalResponse,
    models,
    selectedModelId,
    onSelectModel,
    status: chatStatus,
    suggestions,
    onSend,
    textareaRef,
    onStop,
    hasMoreMessages,
    isLoadingMoreMessages,
    onLoadMoreMessages,
  } = useAssistantContext();

  const hasMessages = displayMessages.length > 0;

  const handleNewConversation = useCallback(() => {
    onSelectConversation?.(undefined);
  }, [onSelectConversation]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex shrink-0 items-center gap-0 px-1 py-1">
        <Button type="button" variant="ghost" size="icon" onClick={toggleChatPanel} title="收起">
          <PanelLeftClose className="size-4" />
        </Button>
        {onSelectConversation && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNewConversation}
              title="新聊天"
            >
              <SquarePen className="size-4" />
            </Button>
            <ChatHistory
              datasetId={datasetId ?? ""}
              currentConversationId={currentConversationId}
              onSelectConversation={onSelectConversation}
            />
          </>
        )}
      </div>

      <InfiniteScrollTop
        className="chat-scroll datasets-chat-scroll min-h-0 flex-1 contain-[layout_style_paint]"
        prependKey={displayMessages[0]?.id ?? null}
        hasMore={hasMoreMessages}
        isLoadingMore={isLoadingMoreMessages}
        onLoadMore={onLoadMoreMessages}
        hideScrollToBottomButton
        forceFullHeight={!hasMessages}
        initial={chatStatus === "streaming" ? "smooth" : "instant"}
        resize={chatStatus === "streaming" ? "smooth" : "instant"}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 pb-10">
          {hasMessages ? (
            <div className="flex flex-col gap-4">
              {displayMessages.map((displayMsg) => (
                <MessageItem
                  key={displayMsg.id}
                  displayMessage={displayMsg}
                  isStreaming={streamingMessageId === displayMsg.id}
                  liked={liked[displayMsg.id]}
                  disliked={disliked[displayMsg.id]}
                  //   onLike={onLike}
                  //   onDislike={onDislike}
                  onRegenerate={onRegenerate}
                  onEditMessage={onEditMessage}
                  onSwitchBranch={onSwitchBranch}
                  addToolApprovalResponse={addToolApprovalResponse}
                />
              ))}
            </div>
          ) : (
            <ChatWelcome config={welcomeConfig} />
          )}
        </div>

        <ChatInput
          hasMessages={hasMessages}
          suggestions={suggestions}
          status={chatStatus}
          onSend={onSend}
          models={models as Model[]}
          selectedModelId={selectedModelId}
          onSelectModel={onSelectModel}
          textareaRef={textareaRef}
          onStop={onStop}
        />
      </InfiniteScrollTop>
    </div>
  );
}
