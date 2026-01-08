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
import { GlobeIcon } from "lucide-react";
import type { FormEvent, RefObject } from "react";

export interface PromptInputProps {
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  status?: "submitted" | "streaming" | "ready" | "error";
  onSubmit?: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
  globalDrop?: boolean;
  multiple?: boolean;
}

export const PromptInput = ({
  textareaRef,
  status = "ready",
  onSubmit,
  globalDrop,
  multiple,
}: PromptInputProps) => {
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
          <AIPromptInputSubmit status={status} />
        </AIPromptInputFooter>
      </AIPromptInput>
    </AIPromptInputProvider>
  );
};
