import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { EditorContentRenderer } from "@buildingai/ui/components/editor";
import {
  InfiniteScrollTop,
  InfiniteScrollTopScrollButton,
  useInfiniteScrollTopContext,
} from "@buildingai/ui/components/infinite-scroll-top";
import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import { SidebarTrigger } from "@buildingai/ui/components/ui/sidebar";
import { cn } from "@buildingai/ui/lib/utils";
import { ShareIcon } from "lucide-react";
import type { FormEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { PromptInput } from "./components/input/prompt-input";
import { Suggestions } from "./components/input/suggestions";
import { MessageItem } from "./components/message/message-item";
import { ModelSelector } from "./components/model-selector";
import { useAssistantContext } from "./context";

export interface ChatProps {
  title?: string;
  onShare?: () => void;
  /** 欢迎标题（纯文本） */
  welcomeTitle?: string;
  /** 欢迎描述（富文本 JSON 字符串，由 EditorContentRenderer 渲染） */
  welcomeDescription?: string;
  /** 页脚文案 */
  footerText?: string;
}

const ChatHeader = memo(function ChatHeader({
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
  const { t } = useI18n();
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
          <span className="sr-only">{t("common.askAssistant.share")}</span>
        </Button>
      )}
    </header>
  );
});

/**
 * 解析欢迎描述为 Plate 富文本或纯文本
 * 兼容 JSON 节点数组与纯文本
 */
function parseWelcomeDescription(
  raw?: string,
): { type: "rich"; value: unknown[] } | { type: "text"; value: string } | null {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return { type: "rich", value: parsed };
  } catch {
    /* 非 JSON，按纯文本处理 */
  }
  return { type: "text", value: raw };
}

const WelcomeMessage = memo(function WelcomeMessage({
  welcomeTitle,
  welcomeDescription,
}: {
  welcomeTitle?: string;
  welcomeDescription?: string;
}) {
  const { t } = useI18n();
  const descContent = useMemo(
    () => parseWelcomeDescription(welcomeDescription),
    [welcomeDescription],
  );

  return (
    <div className="flex flex-1 items-center justify-center py-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">{welcomeTitle || t("common.askAssistant.welcomeToAIAssistant")}</h2>
        {descContent?.type === "rich" ? (
          <div className="mt-2">
            <EditorContentRenderer
              value={descContent.value as Parameters<typeof EditorContentRenderer>[0]["value"]}
            />
          </div>
        ) : descContent?.type === "text" ? (
          <p className="text-muted-foreground mt-2">{descContent.value}</p>
        ) : (
          <p className="text-muted-foreground mt-2">{t("common.askAssistant.startConversationOrChoose")}</p>
        )}
      </div>
    </div>
  );
});

const LoadingIndicator = memo(function LoadingIndicator() {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 items-center justify-center py-4">
      <div className="text-center">
        <p className="text-muted-foreground">{t("common.askAssistant.loading")}</p>
      </div>
    </div>
  );
});

const MessageList = memo(function MessageList() {
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
  } = useAssistantContext();

  return (
    <>
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
    </>
  );
});

const InputArea = memo(function InputArea({
  hasMessages,
  footerText,
}: {
  hasMessages: boolean;
  footerText?: string;
}) {
  const { t } = useI18n();
  const { suggestions, status, textareaRef, isLoading, onSend, onStop, selectedModelId } =
    useAssistantContext();
  const { id } = useParams<{ id: string }>();
  const { isAtBottom, scrollToBottom } = useInfiniteScrollTopContext();

  const handleSubmit = useCallback(
    async (message: PromptInputMessage, _event: FormEvent<HTMLFormElement>) => {
      if (!selectedModelId) {
        toast.warning(t("common.askAssistant.pleaseSelectModelFirst"));
        throw new Error("No model selected");
      }
      const text = message.text?.trim();
      if (text || (message.files && message.files.length > 0)) {
        onSend(text || "", message.files);
        if (!isAtBottom) {
          void scrollToBottom();
        }
      }
    },
    [isAtBottom, onSend, scrollToBottom, selectedModelId],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: { id: string; text: string }) => {
      onSend(suggestion.text);
      if (!isAtBottom) {
        void scrollToBottom();
      }
    },
    [isAtBottom, onSend, scrollToBottom],
  );

  return (
    <div className={cn("sticky z-10", id ? "bottom-13" : "bottom-0")}>
      <InfiniteScrollTopScrollButton className="-top-12 z-20" />
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
        {footerText || t("common.askAssistant.contentGeneratedByAI")}
      </div>
    </div>
  );
});

export const Chat = memo(function Chat({
  title,
  onShare,
  welcomeTitle,
  welcomeDescription,
  footerText,
}: ChatProps) {
  const {
    displayMessages,
    models,
    selectedModelId,
    isLoading,
    status: chatStatus,
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
      const timer = setTimeout(() => setSmooth(true), 200);
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
      return <WelcomeMessage welcomeTitle={welcomeTitle} welcomeDescription={welcomeDescription} />;
    }

    return null;
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <ChatHeader
        title={title}
        models={models}
        selectedModelId={selectedModelId}
        onSelectModel={onSelectModel}
        onShare={onShare}
      />

      <InfiniteScrollTop
        className={cn("chat-scroll flex-1", "contain-[layout_style_paint]")}
        prependKey={displayMessages[0]?.id ?? null}
        hasMore={hasMoreMessages}
        isLoadingMore={isLoadingMoreMessages}
        onLoadMore={id ? onLoadMoreMessages : undefined}
        hideScrollToBottomButton
        forceFullHeight={!id && !hasMessages}
        initial={chatStatus === "streaming" ? "smooth" : "instant"}
        resize={chatStatus === "streaming" ? "smooth" : "instant"}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 pb-10",
            "transition-opacity duration-200 ease-out",
            smooth ? "opacity-100" : "opacity-0",
          )}
        >
          {renderContent()}
        </div>
        <InputArea hasMessages={hasMessages} footerText={footerText} />
      </InfiniteScrollTop>
    </div>
  );
});
