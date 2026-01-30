import { useAssistantStore } from "@buildingai/stores";
import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import {
  InfiniteScrollTop,
  InfiniteScrollTopScrollButton,
} from "@buildingai/ui/components/infinite-scroll-top";
import { cn } from "@buildingai/ui/lib/utils";
import { IconBulb } from "@tabler/icons-react";
import type { FormEvent, ReactNode } from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import type { Model } from "@/components/ask-assistant-ui";
import { ModelSelector, PromptInput, Suggestions } from "@/components/ask-assistant-ui";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface WelcomeConfig {
  title: string;
  creator?: string;
  instruction?: string;
}

export interface ChatContentProps {
  welcomeConfig?: WelcomeConfig;
  welcomeMessage?: ReactNode | string;
  messages?: ChatMessage[];
  onSend?: (text: string, files?: PromptInputMessage["files"]) => void;
  status?: "ready" | "submitted" | "streaming" | "error";
  models?: Model[];
  selectedModelId?: string;
  onSelectModel?: (modelId: string) => void;
  suggestions?: { id: string; text: string }[];
}

const DEFAULT_SUGGESTIONS = [
  { id: "1", text: "这个知识库主要包含哪些内容？" },
  { id: "2", text: "请根据知识库内容回答我的问题" },
  { id: "3", text: "总结一下知识库中的关键信息" },
];

const DEFAULT_INSTRUCTION = "你可以通过提问了解知识库中的相关内容";

const WelcomeMessage = memo(function WelcomeMessage({
  config,
  fallback,
}: {
  config?: WelcomeConfig | null;
  fallback?: ReactNode | string;
}) {
  const title = config?.title ?? "知识库";
  const creator = config?.creator;
  const instruction = config?.instruction ?? DEFAULT_INSTRUCTION;

  if (!config) {
    if (fallback) {
      return (
        <div className="flex flex-1 items-center justify-center py-4">
          <div className="text-center">{fallback}</div>
        </div>
      );
    }
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)] mask-[radial-gradient(ellipse_80%_80%_at_50%_50%,black_0%,black_35%,transparent_70%)] bg-size-[20px_20px] [-webkit-mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_0%,black_35%,transparent_70%)]"
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <div className="bg-foreground flex size-20 items-center justify-center rounded-full">
          <IconBulb className="text-background size-10" stroke={1.5} />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">{title}</h2>
          {creator && <p className="text-muted-foreground text-sm">创建人: {creator}</p>}
          <p className="text-muted-foreground mt-1 text-sm">{instruction}</p>
        </div>
      </div>
    </div>
  );
});

const SimpleMessageBubble = memo(function SimpleMessageBubble({
  message,
}: {
  message: ChatMessage;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        <p className="text-sm wrap-break-word whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
});

const InputArea = memo(function InputArea({
  hasMessages,
  suggestions,
  status,
  onSend,
  models,
  selectedModelId,
  onSelectModel,
}: {
  hasMessages: boolean;
  suggestions: { id: string; text: string }[];
  status: ChatContentProps["status"];
  onSend: (text: string, files?: PromptInputMessage["files"]) => void;
  models: Model[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
}) {
  const { id } = useParams<{ id: string }>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  const handleSubmit = useCallback(
    (message: PromptInputMessage, _event: FormEvent<HTMLFormElement>) => {
      const text = message.text?.trim();
      if (text || (message.files && message.files.length > 0)) {
        onSend(text || "", message.files);
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
    <div className={cn("sticky z-10", id ? "bottom-0" : "bottom-0")}>
      <InfiniteScrollTopScrollButton className="-top-12 z-20" />
      <div className="bg-background mx-auto w-full max-w-3xl rounded-t-lg">
        {!hasMessages && suggestions.length > 0 && status !== "streaming" && (
          <Suggestions suggestions={suggestions} onSuggestionClick={handleSuggestionClick} />
        )}
        <PromptInput
          textareaRef={textareaRef}
          status={status ?? "ready"}
          onSubmit={handleSubmit}
          models={models}
          selectedModelId={selectedModelId}
          onSelectMcpServers={() => {}}
          onSetFeature={() => {}}
        >
          <ModelSelector
            models={models}
            selectedModelId={selectedModelId}
            onModelChange={onSelectModel}
            open={modelSelectorOpen}
            onOpenChange={setModelSelectorOpen}
          />
        </PromptInput>
      </div>
      <div className="text-muted-foreground bg-background py-1.5 text-center text-xs">
        内容由 AI 生成，请仔细甄别
      </div>
    </div>
  );
});

export function ChatContent({
  welcomeConfig,
  welcomeMessage,
  messages = [],
  onSend,
  status = "ready",
  models = [],
  selectedModelId: selectedModelIdProp,
  onSelectModel: onSelectModelProp,
  suggestions = DEFAULT_SUGGESTIONS,
}: ChatContentProps) {
  const storeSelectedModelId = useAssistantStore((s) => s.selectedModelId);
  const setStoreSelectedModelId = useAssistantStore((s) => s.setSelectedModelId);
  const selectedModelId = selectedModelIdProp ?? storeSelectedModelId;

  useEffect(() => {
    if (models.length === 0 || selectedModelIdProp !== undefined) return;
    const currentId = storeSelectedModelId;
    const isValidModel = models.some((m) => m.id === currentId);
    const modelId = isValidModel ? currentId : models[0].id;
    if (modelId !== currentId || !currentId) {
      setStoreSelectedModelId(modelId);
    }
  }, [models, storeSelectedModelId, selectedModelIdProp, setStoreSelectedModelId]);

  const handleSelectModel = useCallback(
    (modelId: string) => {
      setStoreSelectedModelId(modelId);
      onSelectModelProp?.(modelId);
    },
    [setStoreSelectedModelId, onSelectModelProp],
  );
  const onSelectModel = onSelectModelProp ?? handleSelectModel;

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
            <div className="flex flex-col gap-4">
              {messages.map((msg) => (
                <SimpleMessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          ) : (
            <WelcomeMessage config={welcomeConfig} fallback={welcomeMessage} />
          )}
        </div>
        <InputArea
          hasMessages={hasMessages}
          suggestions={suggestions}
          status={status}
          onSend={handleSend}
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={onSelectModel}
        />
      </InfiniteScrollTop>
    </div>
  );
}
