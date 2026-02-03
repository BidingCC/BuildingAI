import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { InfiniteScrollTop } from "@buildingai/ui/components/infinite-scroll-top";
import { cn } from "@buildingai/ui/lib/utils";
import { useCallback } from "react";

import type { Model } from "@/components/ask-assistant-ui";

import { DEFAULT_SUGGESTIONS } from "../../constants";
import { useChatModel } from "../../hooks";
import type { ChatContainerProps, ChatMessage as ChatMessageType } from "../../types";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { ChatWelcome } from "./chat-welcome";

export function ChatContainer({
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
        className={cn("chat-scroll flex-1", "contain-[layout_style_paint]")}
        prependKey={messages[0]?.id ?? null}
        hasMore={false}
        isLoadingMore={false}
        hideScrollToBottomButton
        forceFullHeight={!hasMessages}
        initial="instant"
        resize="instant"
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 pb-10",
            "opacity-100 transition-opacity duration-200 ease-out",
          )}
        >
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

// 消息列表子组件
function MessageList({ messages }: { messages: ChatMessageType[] }) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
    </div>
  );
}
