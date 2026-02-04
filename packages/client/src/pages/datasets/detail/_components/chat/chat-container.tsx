import { useDatasetsConversationsQuery } from "@buildingai/services/web";
import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { InfiniteScrollTop } from "@buildingai/ui/components/infinite-scroll-top";
import { Button } from "@buildingai/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { cn } from "@buildingai/ui/lib/utils";
import { History, Plus } from "lucide-react";
import { useCallback, useState } from "react";

import type { Model } from "@/components/ask-assistant-ui";
import { MessageItem, useAssistantContext } from "@/components/ask-assistant-ui";

import { useChatModel } from "../../hooks";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { ChatWelcome } from "./chat-welcome";

export interface ChatMessageType {
  id: string;
  role: "user" | "assistant";
  content: string;
}

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

export interface ChatContainerProps {
  assistantMode?: boolean;
  welcomeConfig?: WelcomeConfig;
  welcomeMessage?: React.ReactNode | string;
  messages?: ChatMessageType[];
  onSend?: (text: string, files?: PromptInputMessage["files"]) => void;
  status?: ChatStatus;
  models?: Model[];
  selectedModelId?: string;
  onSelectModel?: (modelId: string) => void;
  suggestions?: Suggestion[];
  datasetId?: string;
  currentConversationId?: string;
  onSelectConversation?: (conversationId: string | undefined) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { id: "1", text: "这个知识库主要包含哪些内容？" },
  { id: "2", text: "请根据知识库内容回答我的问题" },
  { id: "3", text: "总结一下知识库中的关键信息" },
];

export function ChatContainer(props: ChatContainerProps) {
  if (props.assistantMode) {
    return <ChatContainerAssistant {...props} />;
  }
  return <ChatContainerWithProps {...props} />;
}

function ChatContainerAssistant({
  welcomeConfig,
  welcomeMessage,
  datasetId,
  currentConversationId,
  onSelectConversation,
}: ChatContainerProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const {
    displayMessages,
    streamingMessageId,
    liked,
    disliked,
    onLike,
    onDislike,
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

  const { data: conversationsData } = useDatasetsConversationsQuery(
    datasetId ?? "",
    { page: 1, pageSize: 30 },
    { enabled: !!datasetId && !!onSelectConversation },
  );
  const conversations = conversationsData?.items ?? [];

  const hasMessages = displayMessages.length > 0;

  const handleNewConversation = useCallback(() => {
    onSelectConversation?.(undefined);
  }, [onSelectConversation]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      onSelectConversation?.(id);
      setHistoryOpen(false);
    },
    [onSelectConversation],
  );

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      {onSelectConversation && (
        <div className="bg-background/60 supports-backdrop-filter:bg-background/50 absolute top-4 right-4 z-20 flex items-center gap-0 rounded-full border shadow-sm backdrop-blur-md">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-l-full rounded-r-none"
            onClick={handleNewConversation}
            title="新建对话"
          >
            <Plus className="size-4" />
          </Button>
          <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-l-none rounded-r-full border-l"
                title="历史记录"
              >
                <History className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <ScrollArea className="max-h-64">
                <ul className="p-1">
                  {conversations.length === 0 ? (
                    <li className="text-muted-foreground px-2 py-4 text-center text-sm">
                      暂无对话
                    </li>
                  ) : (
                    conversations.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectConversation(c.id)}
                          className={cn(
                            "hover:bg-muted w-full truncate rounded-md px-2 py-2 text-left text-sm transition-colors",
                            currentConversationId === c.id && "bg-muted",
                          )}
                          title={c.title ?? "无标题"}
                        >
                          {c.title?.trim() || "无标题"}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <InfiniteScrollTop
        className="chat-scroll min-h-0 flex-1 contain-[layout_style_paint]"
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
                  onLike={onLike}
                  onDislike={onDislike}
                  onRegenerate={onRegenerate}
                  onEditMessage={onEditMessage}
                  onSwitchBranch={onSwitchBranch}
                  addToolApprovalResponse={addToolApprovalResponse}
                />
              ))}
            </div>
          ) : (
            <ChatWelcome config={welcomeConfig} fallback={welcomeMessage} />
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

function ChatContainerWithProps({
  welcomeConfig,
  welcomeMessage,
  messages = [],
  onSend,
  status = "ready",
  models = [],
  selectedModelId: selectedModelIdProp,
  onSelectModel: onSelectModelProp,
  suggestions = DEFAULT_SUGGESTIONS,
}: ChatContainerProps) {
  const { selectedModelId, handleSelectModel } = useChatModel({
    models,
    selectedModelIdProp,
    onSelectModelProp,
  });

  const handleSend = useCallback(
    (text: string, files?: PromptInputMessage["files"]) => {
      onSend?.(text, files);
    },
    [onSend],
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <InfiniteScrollTop
        className="chat-scroll min-h-0 flex-1 contain-[layout_style_paint]"
        prependKey={messages[0]?.id ?? null}
        hasMore={false}
        isLoadingMore={false}
        hideScrollToBottomButton
        forceFullHeight={!hasMessages}
        initial="instant"
        resize="instant"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 pb-10">
          {hasMessages ? (
            <MessageList messages={messages} />
          ) : (
            <ChatWelcome config={welcomeConfig} fallback={welcomeMessage} />
          )}
        </div>

        <ChatInput
          hasMessages={hasMessages}
          suggestions={suggestions}
          status={status}
          onSend={handleSend}
          models={models as Model[]}
          selectedModelId={selectedModelId}
          onSelectModel={handleSelectModel}
        />
      </InfiniteScrollTop>
    </div>
  );
}

function MessageList({ messages }: { messages: ChatMessageType[] }) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
    </div>
  );
}
