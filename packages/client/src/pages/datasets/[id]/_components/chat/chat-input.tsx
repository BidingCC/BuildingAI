import type { PromptInputMessage } from "@buildingai/ui/components/ai-elements/prompt-input";
import { InfiniteScrollTopScrollButton } from "@buildingai/ui/components/infinite-scroll-top";
import { cn } from "@buildingai/ui/lib/utils";
import type { FormEvent } from "react";
import { memo, useCallback, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import type { Model } from "@/components/ask-assistant-ui";
import { ModelSelector, PromptInput, Suggestions } from "@/components/ask-assistant-ui";

import { AI_DISCLAIMER } from "../../constants";
import type { ChatStatus, Suggestion } from "../../types";

interface ChatInputProps {
  hasMessages: boolean;
  suggestions: Suggestion[];
  status: ChatStatus;
  onSend: (text: string, files?: PromptInputMessage["files"]) => void;
  models: Model[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
}

export const ChatInput = memo(function ChatInput({
  hasMessages,
  suggestions,
  status,
  onSend,
  models,
  selectedModelId,
  onSelectModel,
}: ChatInputProps) {
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
    (suggestion: Suggestion) => {
      onSend(suggestion.text);
    },
    [onSend],
  );

  const showSuggestions = !hasMessages && suggestions.length > 0 && status !== "streaming";

  return (
    <div className={cn("sticky z-10", id ? "bottom-0" : "bottom-0")}>
      <InfiniteScrollTopScrollButton className="-top-12 z-20" />

      <div className="bg-background mx-auto w-full max-w-3xl rounded-t-lg">
        {showSuggestions && (
          <Suggestions suggestions={suggestions} onSuggestionClick={handleSuggestionClick} />
        )}

        <PromptInput
          textareaRef={textareaRef}
          status={status}
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
        {AI_DISCLAIMER}
      </div>
    </div>
  );
});
