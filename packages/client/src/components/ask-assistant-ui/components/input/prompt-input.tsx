import { useMcpServersAllQuery } from "@buildingai/services/web";
import {
  PromptInput as AIPromptInput,
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
import { DropdownMenuItem } from "@buildingai/ui/components/ui/dropdown-menu";
import { FileIcon, GlobeIcon, ImageIcon, MicIcon, Square, VideoIcon } from "lucide-react";
import type { FormEvent, RefObject } from "react";
import { memo, useCallback, useMemo } from "react";

import { useAssistantContext } from "../../context";
import { type FileType, useFileUpload } from "../../hooks/use-file-upload";
import { McpSelector } from "../mcp-selector";

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

const FILE_MENU_ITEMS = [
  { type: "image" as const, icon: ImageIcon, label: "添加图片" },
  { type: "video" as const, icon: VideoIcon, label: "添加视频" },
  { type: "audio" as const, icon: MicIcon, label: "添加音频" },
  { type: "file" as const, icon: FileIcon, label: "添加文件" },
] as const;

const FileSelectMenu = memo(
  ({
    onFileSelect,
    availableTypes,
  }: {
    onFileSelect: (type: FileType) => void;
    availableTypes: FileType[];
  }) => (
    <AIPromptInputActionMenuContent>
      {FILE_MENU_ITEMS.filter((item) => availableTypes.includes(item.type)).map(
        ({ type, icon: Icon, label }) => (
          <DropdownMenuItem key={type} onSelect={() => onFileSelect(type)}>
            <Icon className="mr-2 size-4" />
            {label}
          </DropdownMenuItem>
        ),
      )}
    </AIPromptInputActionMenuContent>
  ),
);

FileSelectMenu.displayName = "FileSelectMenu";

const PromptInputInner = memo(
  ({ textareaRef, status, onStop, globalDrop, multiple, onSubmit }: PromptInputProps) => {
    const { models, selectedModelId, selectedMcpServerIds, onSelectMcpServers } =
      useAssistantContext();
    const selectedModel = useMemo(
      () => models.find((m) => m.id === selectedModelId),
      [models, selectedModelId],
    );

    const { data: mcpServers = [], isLoading: isLoadingMcpServers } = useMcpServersAllQuery({
      enabled: true,
    });

    const { handleFileSelect, uploadFilesIfNeeded, availableFileTypes } = useFileUpload(
      multiple,
      selectedModel?.features,
    );

    const handleSubmit = useCallback(
      async (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => {
        if (message.files?.length) {
          message.files = await uploadFilesIfNeeded(message.files);
        }
        onSubmit?.(message, event);
      },
      [onSubmit, uploadFilesIfNeeded],
    );

    return (
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
              <FileSelectMenu onFileSelect={handleFileSelect} availableTypes={availableFileTypes} />
            </AIPromptInputActionMenu>
            <AIPromptInputSpeechButton textareaRef={textareaRef} />
            <AIPromptInputButton>
              <GlobeIcon size={16} />
              <span>Search</span>
            </AIPromptInputButton>
            {!isLoadingMcpServers && mcpServers.length > 0 && (
              <McpSelector
                mcpServers={mcpServers}
                selectedMcpServerIds={selectedMcpServerIds}
                onSelectionChange={onSelectMcpServers}
              />
            )}
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
    );
  },
);

PromptInputInner.displayName = "PromptInputInner";

export const PromptInput = memo(
  ({ textareaRef, status = "ready", onSubmit, onStop, globalDrop, multiple }: PromptInputProps) => {
    return (
      <AIPromptInputProvider>
        <PromptInputInner
          textareaRef={textareaRef}
          status={status}
          onSubmit={onSubmit}
          onStop={onStop}
          globalDrop={globalDrop}
          multiple={multiple}
        />
      </AIPromptInputProvider>
    );
  },
);

PromptInput.displayName = "PromptInput";
