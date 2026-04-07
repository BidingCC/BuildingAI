import { useI18n } from "@buildingai/i18n";
import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { InfiniteScrollTopScrollButton } from "@buildingai/ui/components/infinite-scroll-top";
import { cn } from "@buildingai/ui/lib/utils";
import type { FormEvent, RefObject } from "react";
import { memo, useCallback, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import type { Model } from "@/components/ask-assistant-ui";
import { ModelSelector, PromptInput, Suggestions } from "@/components/ask-assistant-ui";

import type { ChatStatus, Suggestion } from "./chat-container";

interface ChatInputProps {
  hasMessages: boolean;
  suggestions: Suggestion[];
  status: ChatStatus;
  onSend: (text: string, files?: PromptInputMessage["files"]) => void;
  models: Model[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  onStop?: () => void;
}

export const ChatInput = memo(function ChatInput({
  hasMessages,
  suggestions,
  status,
  onSend,
  models,
  selectedModelId,
  onSelectModel,
  textareaRef: textareaRefProp,
  onStop,
}: ChatInputProps) {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = textareaRefProp ?? ownRef;
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
    (suggestion: Suggestion) => {
      onSend(suggestion.text);
    },
    [onSend],
  );

  const showSuggestions = !hasMessages && suggestions.length > 0 && status !== "streaming";

  return (
    <div className={cn("sticky z-10", id ? "bottom-13" : "bottom-0")}>
      <InfiniteScrollTopScrollButton className="-top-12 z-20" />

      <div className="bg-background mx-auto w-full max-w-3xl rounded-t-lg">
        {showSuggestions && (
          <Suggestions suggestions={suggestions} onSuggestionClick={handleSuggestionClick} />
        )}

        <PromptInput
          textareaRef={textareaRef}
          status={status}
          onSubmit={handleSubmit}
          onStop={onStop}
          models={models}
          selectedModelId={selectedModelId}
          onSelectMcpServers={() => {}}
          onSetFeature={() => {}}
          hiddenTools={["more", "mcp", "quickMenu"]}
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
        {t("chat.aiGeneratedDisclaimer")}
      </div>
    </div>
  );
});
