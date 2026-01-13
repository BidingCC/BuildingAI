import {
  PromptInput as AIPromptInput,
  PromptInputActionAddAttachments as AIPromptInputActionAddAttachments,
  PromptInputActionMenu as AIPromptInputActionMenu,
  PromptInputActionMenuContent as AIPromptInputActionMenuContent,
  PromptInputActionMenuTrigger as AIPromptInputActionMenuTrigger,
  PromptInputAttachment as AIPromptInputAttachment,
  PromptInputAttachments as AIPromptInputAttachments,
  PromptInputBody as AIPromptInputBody,
  PromptInputButton as AIPromptInputButton,
  PromptInputFooter as AIPromptInputFooter,
  type PromptInputMessage,
  PromptInputProvider as AIPromptInputProvider,
  PromptInputSpeechButton as AIPromptInputSpeechButton,
  PromptInputSubmit as AIPromptInputSubmit,
  PromptInputTextarea as AIPromptInputTextarea,
  PromptInputTools as AIPromptInputTools,
} from "@buildingai/ui/components/ai-elements/prompt-input";
import { Button } from "@buildingai/ui/components/ui/button";
import { GlobeIcon, Square } from "lucide-react";
import type { FormEvent, RefObject } from "react";
import { memo } from "react";

export interface PromptInputProps {
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  status?: "submitted" | "streaming" | "ready" | "error";
  onSubmit?: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
  onStop?: () => void;
  globalDrop?: boolean;
  multiple?: boolean;
}

const StopButton = memo(({ onStop }: { onStop: () => void }) => {
  return (
    <Button
      className="bg-foreground text-background hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground size-8 rounded-full p-1 transition-colors duration-200"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        onStop();
      }}
    >
      <Square size={14} />
    </Button>
  );
});

StopButton.displayName = "StopButton";

export const PromptInput = memo(
  ({ textareaRef, status = "ready", onSubmit, onStop, globalDrop, multiple }: PromptInputProps) => {
    const handleSubmit = (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
      onSubmit?.(message, event);
    };

    return (
      <AIPromptInputProvider>
        <AIPromptInput globalDrop={globalDrop} multiple={multiple} onSubmit={handleSubmit}>
          <AIPromptInputAttachments>
            {(attachment) => <AIPromptInputAttachment data={attachment} />}
          </AIPromptInputAttachments>
          <AIPromptInputBody>
            <AIPromptInputTextarea ref={textareaRef} />
          </AIPromptInputBody>
          <AIPromptInputFooter>
            <AIPromptInputTools>
              <AIPromptInputActionMenu>
                <AIPromptInputActionMenuTrigger />
                <AIPromptInputActionMenuContent>
                  <AIPromptInputActionAddAttachments label="Add files" />
                </AIPromptInputActionMenuContent>
              </AIPromptInputActionMenu>
              <AIPromptInputSpeechButton textareaRef={textareaRef} />
              <AIPromptInputButton>
                <GlobeIcon size={16} />
                <span>Search</span>
              </AIPromptInputButton>
            </AIPromptInputTools>
            {status === "submitted" || status === "streaming" ? (
              onStop ? (
                <StopButton onStop={onStop} />
              ) : (
                <AIPromptInputSubmit status={status} />
              )
            ) : (
              <AIPromptInputSubmit status={status} />
            )}
          </AIPromptInputFooter>
        </AIPromptInput>
      </AIPromptInputProvider>
    );
  },
);

PromptInput.displayName = "PromptInput";
